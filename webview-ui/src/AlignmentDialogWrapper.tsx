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
// import {
//     alignmentFinishedType,
//     WordAlignerDialog,
// } from './components/WordAlignerDialog';

console.log("AlignmentDialogWrapper Started")

interface AlignmentDialogWrapperProps {
    reference: string;
    getConfiguration: (key: string) => Promise<any>;
    getFile: (path: string) => Promise<string|undefined>;
    navigateAndReadFile: (key: string) => Promise<any>;
    getUsfm: () => Promise<string|undefined>;
}

interface SourceMapI{
    [key: string]: string
}

const AlignmentDialogWrapper: React.FC<AlignmentDialogWrapperProps> = ({
    reference,
    getConfiguration,
    getFile,
    getUsfm,
    navigateAndReadFile,
}) => {
    const [targetBookObj, setTargetBookObj] = React.useState<object|null>(null);
    const [originalBookObj, setOrginalBookObj] = React.useState<object|null>(null);
    const [bookId, setBookId] = React.useState<string>('');
    const [chapter, setChapter] = React.useState<string>('1');
    const [chapterList, setChapterList] = React.useState<string[]>([]);
    const [verse, setVerse] = React.useState<string>('1');
    const [verseList, setVerseList] = React.useState<string[]>([]);
    const [targetVerseObj, setTargetVerseObj] = React.useState<object|null>(null);
    const [originalVerseObj, setOriginalVerseObj] = React.useState<object|null>(null);
    const [showAligner, setShowAligner] = React.useState<boolean>(false);
    const [fileModified, setFileModified] = React.useState<boolean>(false);

    function getBookId(bookObjects: object):string|null {
        const details = usfmHelpers.getUSFMDetails(bookObjects)
        return details?.book?.id
    }

    function onAlignedBibleLoad(bookUsfm: string): void {
        console.log('onAlignedBibleLoad data', bookUsfm?.substring(0, 100))
        const bookObjects = bookUsfm && usfmjs.toJSON(bookUsfm)
        if (bookObjects) {
            setTargetBookObj(bookObjects)
            const _bookId = getBookId(bookObjects)
            if (_bookId) {
                setBookId(_bookId || '')
                setOrginalBookObj(null) // clear original book since book has changed
                setFileModified(false)
            }
        }
    }

    function onOriginalBibleLoad(bookUsfm: string): void {
        console.log('onOriginalBibleLoad data', bookUsfm?.substring(0, 100))
        const bookObjects = bookUsfm && usfmjs.toJSON(bookUsfm)
        if (bookObjects) {
            const _bookId = getBookId(bookObjects)
            if (bookId === _bookId) {
                setOrginalBookObj(bookObjects)
            } else {
                console.error(`onOriginalBibleLoad: invalid original book '${_bookId}' loaded, should be '${bookId}'`)
            }
        }
    }

    async function getOriginalBible() {
        const response = await navigateAndReadFile('OriginalBibleUsfm');
        const originalLangContent = response?.contents
        console.log("getOriginalBible() received original USFM. ", originalLangContent?.substring(0, 200));
        if (originalLangContent) {
            onOriginalBibleLoad(originalLangContent)
        }
    }

    async function _getUsfm(){
        console.log( "_getUsfm() requesting USFM:", {reference} );
        const fileContent = await getUsfm();
        console.log( "_getUsfm() received USFM. " + fileContent?.substring(0,400) );
        if( fileContent ){
            await getOriginalBible();
            onAlignedBibleLoad(fileContent)
        }
    }

    if(!targetBookObj){ 
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
        if (!targetBookObj || targetChapters?.length === 0) {
            prompt = 'Missing Target bible'
        } else if(!originalBookObj || originalChapters?.length === 0) {
            return <VSCodeButton style={{ margin: "20px 50px" }} onClick={() => getOriginalBible()}>
                Load Original Book
            </VSCodeButton>;
        } else {
            prompt = 'Have both bibles'
        }

        return <div style={{ padding: "20px"}}> <b> {prompt} </b></div>
    }
    return (
        <div>
            <p>Alignment dialog wrapper</p>
            <p>{`${bookId} - ${reference}`}</p>
            <p>{`target chapters ${targetChapters}`}</p>
            <p>{`original chapters ${originalChapters}`}</p>
            <p>{getPrompt()}</p>
        </div>
    )
}


export default AlignmentDialogWrapper