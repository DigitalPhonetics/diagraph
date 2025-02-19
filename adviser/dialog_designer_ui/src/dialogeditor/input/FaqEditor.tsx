/** @jsxImportSource @emotion/react */
import {ReactElement, useCallback, useEffect, useState } from "react";
import { CustomDialog, useDialog } from 'react-st-modal';
import React from "react";
import { useStoreActions, useStoreState } from "../../store/store";
import { Button } from "react-bootstrap";
import { IFAQQuestion } from "../../types";
import { faqPlaceholderMsg } from "../../lib/labels";
import { createUniqueId } from "../../lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";



export interface QuestionTextEditorProps {
    initialValue?: string
}

export interface QuestionTextEditorResult {
    result: string;
    text: string;
}

export const QuestionTextEditor: React.FC<QuestionTextEditorProps> = (props: QuestionTextEditorProps): ReactElement => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    const dialog = useDialog();
    const [value, setValue] = useState(props.initialValue?? '');
    useEffect(() => setValue(props.initialValue ?? ''), [props.initialValue]);

    return(
        <div>
            <input className="form-control" type="text" value={value} onChange={(newValue) => {setValue(newValue.target.value);}}/>
            <Button
                onClick={() => {
                    // Сlose the dialog and return the value
                    dialog.close({text: value, result: 'save'});
                }}
            >
                Save
            </Button>
        </div>
    );
};

export interface IFAQQuestionListProps {
	nodeId: string,
	faqQuestions: IFAQQuestion[];
	editMode: boolean;
}

export const FAQQuestionList: React.FC<IFAQQuestionListProps> = (props: IFAQQuestionListProps) => {
	const addQuestion = useStoreActions((actions) => actions.addFAQQuestion);
	const changeQuestion = useStoreActions((actions) => actions.changeFAQQuestion);
	const session = useStoreState((state) => state.session);
	const graphId = useStoreState((state) => state.graphId);
	const setShowServerErrorAlert = useStoreActions((actions) => actions.setShowServerErrorAlert);

	const onChangQuestionText = useCallback(async (question: IFAQQuestion) => {
		try {
			let result = await CustomDialog(
				<QuestionTextEditor initialValue={question.text === faqPlaceholderMsg? "" : question.text}/>,
				{
				title: 'FAQ Frage festlegen',
				showCloseIcon: true,
				}
			) as QuestionTextEditorResult;

			if(result.result === 'save') {
				if(result.text !== question.text) {
					// only take new value if string is not empty! otherwise, set default message
					const text = result.text.trim().length > 0? result.text : faqPlaceholderMsg;
					changeQuestion({session: session!, graphId: graphId, args: {faqId: question.id, nodeId: props.nodeId, text: text}}).then((res: boolean) => {
						if(!res) setShowServerErrorAlert(true);
					});
				}
			}
		}
		catch {}
	}, [changeQuestion, props.nodeId, setShowServerErrorAlert, session, graphId]);

	const addNewQuestion = useCallback(() => {
		addQuestion({session: session!, graphId: graphId, args: {id: createUniqueId(), nodeId: props.nodeId, text: faqPlaceholderMsg}}).then((res: boolean) => {
			if(!res) setShowServerErrorAlert(true); 
		})
	}, [addQuestion, session, graphId, setShowServerErrorAlert]);

	return <div>
		{props.faqQuestions.map((question: IFAQQuestion, index) => {
			return <div key={question.id} className="faq" id={`faq_${question.id}`}
						onDoubleClick={(event: React.MouseEvent) => onChangQuestionText(question)}
					>
						<p className="faq-text" id={`pfaq_${question.id}`}>{question.text}</p>
					</div>
			}
		)}
		{props.editMode && <Button style={{backgroundColor: "#c3c3c3", border: "none", marginBottom: '1px'}} onClick={() => addNewQuestion()}>FAQ<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faPlus}/></Button>}
	</div>
};