import { useDialog } from 'react-st-modal';
import { useState, ReactElement, FC, useEffect } from 'react';
import TinyMCEEditor from './TinyMCEEditor';
import React from 'react';

interface NodeTextEditorProps {
    initialValue?: string
}

export interface NodeTextEditorResult {
    result: string;
    text: string;
}


const NodeTextEditor: FC<NodeTextEditorProps> = (props: NodeTextEditorProps): ReactElement => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    const dialog = useDialog();
    const [value, setValue] = useState(props.initialValue?? '');
    useEffect(() => setValue(props.initialValue ?? ''), [props.initialValue]);

    return(
        <div>
            <TinyMCEEditor initialValue={props.initialValue} onValueChange={(newValue) => {setValue(newValue);}}/>
            <button
                onClick={() => {
                    // Сlose the dialog and return the value
                    dialog.close({text: value, result: 'save'});
                }}
            >
                Save
            </button>
        </div>
    );
};

export default NodeTextEditor;