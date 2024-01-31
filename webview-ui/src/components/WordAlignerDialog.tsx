import React, { useEffect, useState } from 'react';
// @ts-ignore
import { AlignmentHelpers, migrateOriginalLanguageHelpers, UsfmFileConversionHelpers, usfmHelpers, WordAligner } from "word-aligner-rcl";
import { NT_ORIG_LANG, OT_ORIG_LANG } from "../common/constants";
// @ts-ignore
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

import * as LexiconData_ from "../common/lexicon/lexicons.json";
import { isNT } from "../common/BooksOfTheBible";
import { isEqual } from "@react-hookz/deep-equal";
const LexiconData: Record<string, Record<string, Record<string,string>>> = LexiconData_

console.log("WordAlignerDialog")

const translate = (key: string) => {
  console.log(`translate(${key})`)
};

const targetWords_: object[] = [], verseAlignments_: object[] = []

export interface ScriptureReferenceType {
  bookId: string|null;
  chapter: number|string;
  verse: number|string;
}

export type alignmentFinishedType = {
  targetVerseObj?: object,
  alignmentChanged: boolean,
};

export interface OnAlignmentFinishedType {
  (data: alignmentFinishedType): void;
}

export type WordAlignerParams = {
  onAlignmentFinished: OnAlignmentFinishedType,
  originalVerseObj: object|null,
  reference: ScriptureReferenceType,
  targetVerseObj: object|null,
};

export function WordAlignerDialog(params: WordAlignerParams) {
  const {
    onAlignmentFinished,
    originalVerseObj,
    reference,
    targetVerseObj,
  } = params
  const [state, setState_] = useState({
    targetWords: targetWords_,
    verseAlignments: verseAlignments_,
    alignmentChanged: false,
    updatedTargetWords: null,
    updatedVerseAlignments: null,
  });
  const {
    targetWords,
    verseAlignments,
    alignmentChanged,
    updatedTargetWords,
    updatedVerseAlignments,
  } = state;
  
  const targetLanguageFont = '';
  const sourceLanguage = isNT(reference?.bookId) ? NT_ORIG_LANG : OT_ORIG_LANG
  const lexicons = {};
  const contextId = {
    reference,
    tool: "wordAlignment",
    groupId: "chapter_1"
  };

  function setState(newState: object) {
    setState_(prevState => ({ ...prevState, ...newState }))
  }

  /**
   * first checks the alignments in the target language, and if the original language content has
   *   changed since the target alignments were made, then we migrate the alignments to match the
   *   current content in the original.
   *   Then we separate out the target words for use in the wordbank on the left, and we separate
   *   out the alignments for the alignment grid.  We create empty alignments for any original
   *   
   */
  function initializeALignmentData() {
    const _targetVerseObj = migrateOriginalLanguageHelpers.migrateTargetAlignmentsToOriginal(targetVerseObj, originalVerseObj)
    if (!isEqual(targetVerseObj, _targetVerseObj)) {
      console.log(`WordAlignerDialog.initializeALignmentData() - migrated alignments`)
    }
    const targetVerseUsfm = UsfmFileConversionHelpers.convertVerseDataToUSFM(_targetVerseObj);
    const originalVerseUsfm = UsfmFileConversionHelpers.convertVerseDataToUSFM(originalVerseObj);
    const {
      targetWords: targetWords_,
      verseAlignments: verseAlignments_,
    } = AlignmentHelpers.parseUsfmToWordAlignerData(targetVerseUsfm, originalVerseUsfm);
    setState({
      targetWords: targetWords_,
      verseAlignments: verseAlignments_,
      alignmentChanged: false,
      updatedTargetWords: null,
      updatedVersAlignments: null,
    });
  }

  useEffect(() => {
    if (targetVerseObj && originalVerseObj) { // initialize aligner data from current verseObjects
      initializeALignmentData();
    }
  }, [ targetVerseObj, originalVerseObj ])
  
  const loadLexiconEntry = (key:string) => {
    console.log(`WordAlignerDialog.loadLexiconEntry(${key})`)
  };
  const getLexiconData_ = (lexiconId:string, entryId:string) => {
    console.log(`WordAlignerDialog.getLexiconData_(${lexiconId}, ${entryId})`)
    const entryData = (LexiconData && LexiconData[lexiconId]) ? LexiconData[lexiconId][entryId] : null;
    return {[lexiconId]: {[entryId]: entryData}};
  };

  function onChange(results:any) {
    console.log(`WordAlignerDialog.onChange() - alignment changed, results`, results);// merge alignments into target verse and convert to USFM
    const {targetWords, verseAlignments} = results;
    const targetVerseUsfm = UsfmFileConversionHelpers.convertVerseDataToUSFM(targetVerseObj);
    const verseUsfm = AlignmentHelpers.addAlignmentsToVerseUSFM(targetWords, verseAlignments, targetVerseUsfm);
    // console.log('WordAlignerDialog.onChange() - verseUsfm', verseUsfm);
    const alignmentComplete = AlignmentHelpers.areAlgnmentsComplete(targetWords, verseAlignments);
    setState({
      alignmentChanged: true,
      updatedTargetWords: targetWords,
      updatedVerseAlignments: verseAlignments,
    })
    console.log(`WordAlignerDialog.onChange() - Alignments are ${alignmentComplete ? 'COMPLETE!' : 'incomplete'}`);
  }

  function onReset() {
    console.log("WordAlignerDialog.onReset() - reset Alignments")
    const alignmentData_ = AlignmentHelpers.resetAlignments(verseAlignments, targetWords)
    setState({
      alignmentChanged: true,
      targetWords: alignmentData_.targetWords,
      verseAlignments: alignmentData_.verseAlignments,
    })
  }

  function onCancel() {
    console.log("WordAlignerDialog.onCancel() - cancel Alignments")
    initializeALignmentData()
    onAlignmentFinished?.({ alignmentChanged: false })
  }

  function onFinish() {
    console.log("WordAlignerDialog.onFinish() - finish Alignments")
    const newState = {
      alignmentChanged,

    };
    
    if (alignmentChanged) {
      const targetVerseUsfm = UsfmFileConversionHelpers.convertVerseDataToUSFM(targetVerseObj);
      const verseUsfm = AlignmentHelpers.addAlignmentsToVerseUSFM(updatedTargetWords, updatedVerseAlignments, targetVerseUsfm)
      const _targetVerseObj = usfmHelpers.usfmVerseToJson(verseUsfm)
      // @ts-ignore
      newState['targetVerseObj'] = _targetVerseObj
    }
    onAlignmentFinished?.(newState)
    setState(newState)
  }

  return (
     <>
      <div style={{height: '650px', width: '800px', paddingBottom: '60px'}}>
          <WordAligner
            styles={{ maxHeight: '450px', overflowY: 'auto' }}
            verseAlignments={verseAlignments}
            targetWords={targetWords}
            translate={translate}
            contextId={contextId}
            targetLanguageFont={targetLanguageFont}
            sourceLanguage={sourceLanguage}
            showPopover={() => { }}
            lexicons={lexicons}
            loadLexiconEntry={loadLexiconEntry}
            onChange={onChange}
            getLexiconData={getLexiconData_}
            resetAlignments={onReset}
          />
      </div>
      <div>
         <VSCodeButton style={{ margin: '10px 50px' }} onClick={onCancel}>
           Cancel Alignments
         </VSCodeButton>
         <VSCodeButton style={{ margin: '10px 50px' }} onClick={onReset}>
           Reset Alignments
         </VSCodeButton>
         <VSCodeButton style={{ margin: '10px 50px' }} onClick={onFinish}>
           Alignments Done
         </VSCodeButton>
      </div>
    </>
  );
}

export default WordAlignerDialog;
