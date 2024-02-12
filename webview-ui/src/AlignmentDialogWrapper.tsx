// @ts-ignore
import React from 'react';
// @ts-ignore
import usfmjs from 'usfm-js';
// @ts-ignore
import { usfmHelpers } from 'word-aligner-rcl';
import {
    VSCodeButton,
    VSCodeDropdown,
    VSCodeOption
} from '@vscode/webview-ui-toolkit/react';
import WordAlignerDialog, { alignmentFinishedType, ScriptureReferenceType } from "./components/WordAlignerDialog.tsx";

console.log("AlignmentDialogWrapper Started")

interface AlignmentDialogWrapperProps {
    reference: string;
    getConfiguration: (key: string) => Promise<any>;
    getFile: (path: string) => Promise<string|undefined>;
    navigateAndReadFile: (key: string) => Promise<any>;
    updateUSFM: (key: string) => Promise<boolean>;
    getUsfm: () => Promise<string|undefined>;
}

interface SourceMapI{
    [key: string]: string
}

const AlignmentDialogWrapper: React.FC<AlignmentDialogWrapperProps> = ({
    reference: refStr,
    getConfiguration,
    getFile,
    getUsfm,
    navigateAndReadFile,
    updateUSFM,
}) => {
    const [targetBookObj, setTargetBookObj] = React.useState<object|null>(null);
    const [originalBookObj, setOrginalBookObj] = React.useState<object|null>(null);
    const [bookId, setBookId] = React.useState<string>('');
    const [targetVerseObj, setTargetVerseObj] = React.useState<object|null>(null);
    const [originalVerseObj, setOriginalVerseObj] = React.useState<object|null>(null);
    const [showAligner, setShowAligner] = React.useState<boolean>(false);
    const [fileModified, setFileModified] = React.useState<boolean>(false);

    const reference = React.useMemo(() => {
        let reference:ScriptureReferenceType = {
            bookId: null,
            chapter: '',
            verse: '',
        }
        if (refStr) {
            const [chapter, verse] = refStr.split(':')
            reference = {
                bookId,
                chapter,
                verse,
            }
        }
        return reference
    }, [ refStr, bookId ])

    function getBookId(bookObjects: object):string|null {
        const details = usfmHelpers.getUSFMDetails(bookObjects)
        return details?.book?.id
    }

    function onAlignedBibleLoad(bookUsfm: string): string|null {
        console.log('onAlignedBibleLoad data', bookUsfm?.substring(0, 100))
        let alignBookId:string|null = null
        const bookObjects = bookUsfm && usfmjs.toJSON(bookUsfm)
        if (bookObjects) {
            setTargetBookObj(bookObjects)
            alignBookId = getBookId(bookObjects)
            if (alignBookId) {
                setBookId(alignBookId || '')
                setOrginalBookObj(null) // clear original book since book has changed
                setFileModified(false)
            }
        }
        return alignBookId
    }

    function onOriginalBibleLoad(bookUsfm: string, alignedBookId: string|null): void {
        let origBookId:string|null = null
        console.log('onOriginalBibleLoad data', bookUsfm?.substring(0, 100))
        const bookObjects = bookUsfm && usfmjs.toJSON(bookUsfm)
        if (bookObjects) {
            origBookId = getBookId(bookObjects)
            if (origBookId === alignedBookId) {
                setOrginalBookObj(bookObjects)
            } else {
                console.error(`onOriginalBibleLoad: invalid original book '${origBookId}' loaded, should be '${alignedBookId}'`)
            }
        }
    }

    React.useEffect(() => {
        let enableAligner = false
        if (targetBookObj && originalBookObj) {
            if (reference.chapter && reference.verse) {
                // @ts-ignore
                const _targetVerseObj = targetBookObj.chapters?.[reference.chapter]?.[reference.verse]
                // @ts-ignore
                const _originalVerseObj = originalBookObj.chapters?.[reference.chapter]?.[reference.verse]
                setTargetVerseObj(_targetVerseObj)
                setOriginalVerseObj(_originalVerseObj)
                enableAligner = true
            }
        }
        setShowAligner(enableAligner)
    }, [ targetBookObj, originalBookObj, reference ])
    
    async function getOriginalBible() {
        const response = await navigateAndReadFile('OriginalBibleUsfm');
        const originalLangContent = response?.contents
        console.log("getOriginalBible() received original USFM. ", originalLangContent?.substring(0, 200));
        return originalLangContent
    }

    async function getNewOriginalBible() {
        const originalLangContent = await getOriginalBible();
        if (originalLangContent) {
            onOriginalBibleLoad(originalLangContent, bookId)
        }
    }

    async function _getUsfm(){
        console.log( "_getUsfm() requesting USFM:", {reference: refStr} );
        const fileContent = await getUsfm();
        console.log( "_getUsfm() received USFM. " + fileContent?.substring(0,400) );
        if( fileContent ){
            const originalLangContent = await getOriginalBible();
            // update state
            const alignedBookId = onAlignedBibleLoad(fileContent)
            if (originalLangContent) {
                onOriginalBibleLoad(originalLangContent, alignedBookId)
            }
        }
    }

    React.useEffect(() => {
        setTargetBookObj(null)
        setOrginalBookObj(null)
        setShowAligner(false)
    }, [ refStr ])

    function onAlignmentFinished(data: alignmentFinishedType): void {
        setShowAligner(false)
        console.log(`onAlignmentFinished: alignmentChanged: ${data?.alignmentChanged}`, data)
        if (data?.alignmentChanged && data?.targetVerseObj) {
            // @ts-ignore
            const verses = targetBookObj?.chapters?.[reference.chapter]
            // make shallow copy of verses and update with new verse content
            const newVerses = { ...verses }
            newVerses[reference?.verse || ''] = data?.targetVerseObj
            const _targetBookObj = targetBookObj
            // @ts-ignore
            _targetBookObj.chapters[reference.chapter] = newVerses;
            setTargetBookObj(_targetBookObj) // save revised
            // TODO save data
            const newUSFM = usfmjs.toUSFM(_targetBookObj)
            updateUSFM(newUSFM); // update whole usfm
            setFileModified(true)
        }
    }

    
    if(!targetBookObj && refStr){ 
        console.log( "requesting targetUsfm:", {reference} );
        _getUsfm(); 
    } else {
        console.log( "Have targetBookObj" );
    }

    // @ts-ignore
    const targetChapters = targetBookObj ? Object.keys(targetBookObj.chapters) : []
    // @ts-ignore
    const originalChapters = originalBookObj ? Object.keys(originalBookObj.chapters) : []

    function getPrompt() {
        let prompt = ''
        if (!refStr) {
            prompt = 'Missing Reference'
        } else if (!targetBookObj || targetChapters?.length === 0) {
            prompt = 'Missing Target bible'
        } else if(!originalBookObj || originalChapters?.length === 0) {
            return <VSCodeButton style={{ margin: "20px 50px" }} onClick={() => getNewOriginalBible()}>
                Load Original Book
            </VSCodeButton>
        } else if (showAligner) {
            console.log("targetVerseObj", Object.keys(targetVerseObj || {}))
            console.log("originalVerseObj", Object.keys(originalVerseObj || {}))
            return <WordAlignerDialog
                targetVerseObj={targetVerseObj}
                originalVerseObj={originalVerseObj}
                onAlignmentFinished={onAlignmentFinished}
                reference={reference}
            />
        } else {
            // prompt = 'Have both bibles, but aligner is not enabled'
            return <VSCodeButton style={{ margin: "20px 50px" }} onClick={() => setShowAligner(true)}>
                Align Verse
            </VSCodeButton>
        }

        return <div style={{ padding: "20px"}}> <b> {prompt} </b></div>
    }

    return (
        <div>
            <p>Alignment dialog wrapper</p>
            <p>{`${bookId} - ${refStr}`}</p>
            <p>{`target chapters ${targetChapters}`}</p>
            <p>{`original chapters ${originalChapters}`}</p>
            <p>{getPrompt()}</p>
        </div>
    )
}


export default AlignmentDialogWrapper