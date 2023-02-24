/** @jsxImportSource @emotion/react */
import { memo, useCallback, useEffect, useState } from "react";
import {
	Handle,
	Position,
  } from 'react-flow-renderer';
import {Button} from 'react-bootstrap';
import { CustomDialog } from 'react-st-modal';
import NodeTextEditor, { NodeTextEditorResult } from '../input/NodeTextEditor';
import { IAnswer, INode } from "../../types";
import { createUniqueId, htmlDecode, sleep } from "../../lib/utils";
import React from "react";
import { useStoreActions, useStoreState } from "../../store/store";
import { AppliedTags } from "../sidebar/TagSelect";
import { faAngleDown, faAngleUp, faMinus, faPlus, faTag } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { answerPlaceholderMsg, systemPlaceholderMsg } from "../../lib/labels";
import { answerMoveArrowStyle, answerStyle, editNodeStyle } from "../../lib/styles";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { useStoreActions as useFlowActions } from "react-flow-renderer";
import { FAQQuestionList, QuestionTextEditor, QuestionTextEditorResult } from "../input/FaqEditor";


const DialogNode: React.FC<INode> = memo((props: INode) => {
	const addAnswer = useStoreActions((actions) => actions.addAnswer);
	const changeNodeMarkup = useStoreActions((actions) => actions.changeNodeMarkup);
	const changeAnswerText = useStoreActions((actions) => actions.changeAnswerText);

	const changeAnswerOrder = useStoreActions((actions) => actions.updateAnswerList);
	const [reOpenNode, setReopenNode] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const setSelectedElements = useFlowActions((actions) => actions.setSelectedElements);
	const unsetUserSelection = useFlowActions((actions) => actions.unsetUserSelection);
	const setClickedAnswerId = useStoreActions((actions) => actions.setClickedAnswerId);

	const session = useStoreState((state) => state.session);
	const graphId = useStoreState((state) => state.graphId);
	const setShowServerErrorAlert = useStoreActions((actions) => actions.setShowServerErrorAlert);

	const onChangeNodeMarkup = useCallback(async () => {
		try {
			let result = await CustomDialog(
				<NodeTextEditor initialValue={props.data.markup === systemPlaceholderMsg? "" : props.data.markup}/>,
				{
				title: 'Specify a system message',
				showCloseIcon: true,
				}
			) as NodeTextEditorResult;

			if(result.result === 'save') {
				if(result.text !== props.data.markup) {
					// only take new value if string is not empty! otherwise, set default message
					const raw_content = htmlDecode(result.text);
					const text = raw_content.trim().length > 0? result.text : systemPlaceholderMsg;
					changeNodeMarkup({session: session!, graphId: graphId, args: {nodeId: props.id, markup: text}}).then((res: boolean) => {
						if(!res) setShowServerErrorAlert(true);
					});
				}
			}
		}
		catch {}
	}, [changeNodeMarkup, props.data.markup, props.id, session, graphId, setShowServerErrorAlert]);

	// const onAnswerDoubleClick = useCallback(async (evt: React.MouseEvent, answerId: string) => {
	// 	evt.preventDefault();
	// 	evt.stopPropagation();
	// 	try {
	// 		const answer = props.data.answers.find(answer => answer.id === answerId)!;
	// 		let result = await CustomDialog(
	// 			<NodeTextEditor initialValue={answer.markup === answerPlaceholderMsg? "" : answer.markup}/>,
	// 			{
	// 			title: 'Nutzereingabe festlegen',
	// 			showCloseIcon: true,
	// 			}
	// 		) as NodeTextEditorResult;

	// 		if(result.result === 'save') {
	// 			if(result.text !== answer.markup) {
	// 				// only take new value if string is not empty! otherwise, set default message
	// 				const raw_content = htmlDecode(result.text);
	// 				const text = raw_content.trim().length > 0? result.text : answerPlaceholderMsg;
	// 				changeAnswerMarkup({nodeId: props.id, answerId: answerId, markup: text});
	// 			}
	// 		}
	// 	}
	// 	catch {}
	// }, [changeAnswerMarkup, props.data.answers, props.id]);

	const onAnswerDoubleClick = useCallback(async (evt: React.MouseEvent, answerId: string) => {
		evt.preventDefault();
		evt.stopPropagation();
		try {
			const answer = props.data.answers.find(answer => answer.id === answerId)!;
			let result = await CustomDialog(
				<QuestionTextEditor initialValue={answer.text === answerPlaceholderMsg? "" : answer.text}/>,
				{
				title: 'Specify a user response',
				showCloseIcon: true,
				}
			) as QuestionTextEditorResult;

			if(result.result === 'save') {
				if(result.text !== answer.text) {
					// only take new value if string is not empty! otherwise, set default message
					const text = result.text.trim().length > 0? result.text : answerPlaceholderMsg;
					changeAnswerText({session: session!, graphId: graphId, args: {nodeId: props.id, answerId: answerId, text: text}}).then((res: boolean) => {
						if(!res) setShowServerErrorAlert(true);
					});
				}
			}
		}
		catch {}
	}, [changeAnswerText, props.data.answers, props.id, session, graphId, setShowServerErrorAlert]);


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const updateNodeState = useEffect(() => {
		if(!props.selected) {
			setEditMode(false);
		}
		if(reOpenNode) {
			(async() =>{
				await sleep(10);
				setReopenNode(false);
				setEditMode(true);
			})()
		}
	}, [props.selected, reOpenNode, setReopenNode, setEditMode]);

	const onReorder = useCallback(async (answerIndex: number, eventType: string) => {
		if (eventType === "up"){
			let newList = props.data.answers.slice(0, answerIndex - 1);
			
			const answer1 = props.data.answers[answerIndex];
			const answer2 = props.data.answers[answerIndex-1];
			newList.push(answer1, answer2);

			await changeAnswerOrder({session: session!, graphId: graphId, args: {nodeId: props.id,
									answerList: newList.concat(props.data.answers.slice(answerIndex + 1)), 
								}}).then((res: boolean) => {
									if(!res) setShowServerErrorAlert(true);
								});
			setEditMode(false);
			setReopenNode(true);
		}
		else if (eventType === "down"){
			let newList = props.data.answers.slice(0, answerIndex);
			
			const answer1 = props.data.answers[answerIndex+1];
			const answer2 = props.data.answers[answerIndex];
			newList.push(answer1, answer2);

			await changeAnswerOrder({session: session!, graphId: graphId, args: {nodeId: props.id,
									answerList: newList.concat(props.data.answers.slice(answerIndex + 2)), 
								}}).then((res: boolean) => {
									if(!res) setShowServerErrorAlert(true);
								});
			setEditMode(false);
			setReopenNode(true);
		}
	}, [changeAnswerOrder, props.data.answers, props.id, setEditMode, session, graphId, setShowServerErrorAlert]);

	const onRightClick = useCallback(() => {
		if(!props.selected) {
			setSelectedElements([]);
			unsetUserSelection();
			setSelectedElements([props]);
		}
	}, [setSelectedElements, unsetUserSelection, props]);

	const addNewAnswer = useCallback(() => {
		addAnswer({session: session!, graphId: graphId, args: {id: createUniqueId(), nodeId: props.id, text: answerPlaceholderMsg}}).then((res: boolean) => {
			if(!res) setShowServerErrorAlert(true);
		});
		
	}, [addAnswer, session, graphId, props.id, setShowServerErrorAlert]);


	return (
		<div
			onContextMenu={onRightClick}
			style={{paddingLeft: 7, paddingTop: 7, minWidth:"50px"}}
			id={props.id} 
		>
			<div className='leftConnector'/>
			<Handle
				type="target"
				className="leftConnectorHitbox"
				position={Position.Left}
				style={{ top: 'calc(7px + 50%)', width: '28px', height: '28px', left: '-14px', backgroundColor: 'transparent', borderColor: 'transparent' }}
				isConnectable={true}
			/>
			<FontAwesomeIcon onClick={() => setEditMode(!editMode)} icon={editMode? faMinus: faEdit} css={editNodeStyle(editMode)}/>
			<p className="system-text" onDoubleClick={onChangeNodeMarkup}>
				{htmlDecode(props.data.markup)}
			</p>
			{ editMode && <h4 style={{backgroundColor: "#f0f0f0", marginLeft: "-7px", paddingLeft: "7px"}}>User Responses</h4> }
			{
				props.data.answers.map((answer: IAnswer, index) => {
				return <div key={answer.id} css={answerStyle(editMode)} id={`ans_${answer.id}`}
							onDoubleClick={(event: React.MouseEvent) => onAnswerDoubleClick(event, answer.id)}
							onClick={() => {if(!editMode) {setClickedAnswerId(answer.id)}}}
						>
							<p className="answer-text" id={`pans_${answer.id}`}>{answer.text}</p>
							{ 
								editMode && props.data.answers.length > 1 && 
								<div style={{position: "absolute", right: "10px", top: "5px", zIndex: 100}}>
									{index > 0 && <FontAwesomeIcon icon={faAngleUp} css={answerMoveArrowStyle} onClick={(e) => {onReorder(index, "up")}}/>}
									{index < props.data.answers.length - 1 && <FontAwesomeIcon icon={faAngleDown} css={answerMoveArrowStyle} onClick={() => {onReorder(index, "down")}}/>}
								</div>
							}
							<Handle
								type="source"
								id={answer.id}
								position={Position.Right}
								style={{width: '14px', height: '14px', top: '50%', right: '-9px'}}
								isConnectable={true}
							/>
						</div>
					}
				)
			}
			{editMode && <Button style={{backgroundColor: '#1982C4', border: "none", marginBottom: '5px', marginTop: '2px'}} onClick={() => addNewAnswer()}>Response<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faPlus}/></Button>}
			{ editMode && <h4 style={{backgroundColor: "#f0f0f0", marginLeft: "-7px", paddingLeft: "7px"}}>FAQs</h4>}
			{ editMode && <FAQQuestionList nodeId={props.id} faqQuestions={props.data.questions} editMode={editMode}/>}
			{editMode && <h4 style={{backgroundColor: "#f0f0f0", marginTop: "5px", marginLeft: "-7px", paddingLeft: "7px"}}>Tags<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faTag}/></h4> }
			<AppliedTags tags={props.data.tags} nodeId={props.id} selected={editMode}/>
		</div>
	);
});

export default DialogNode;

