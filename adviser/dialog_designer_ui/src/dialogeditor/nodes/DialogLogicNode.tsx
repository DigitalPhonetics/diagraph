/** @jsxImportSource @emotion/react */
import { memo, useCallback, useEffect, useState } from "react";
import { Handle, Position } from 'react-flow-renderer';
import { CustomDialog, useDialog } from 'react-st-modal';
import { IAnswer, INode, IVariable } from "../../types";
import { createUniqueId, sleep } from "../../lib/utils";
import React from "react";
import { useStoreActions, useStoreState } from "../../store/store";
import { AppliedTags } from "../sidebar/TagSelect";
import { Button, Col, Form, FormSelect, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faAngleUp, faCodeBranch, faMinus, faPlus, faTag } from "@fortawesome/free-solid-svg-icons";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { answerMoveArrowStyle, answerStyle, editNodeStyle, elseStyle } from "../../lib/styles";
import { useStoreActions as useFlowActions } from "react-flow-renderer";

interface DialogVariableEditorProps {
    name?: string;
	variables: IVariable[];
}

interface DialogVariableEditorResult {
    result: string;
    name: string;
}


const DialogVariableEditor = (props: DialogVariableEditorProps) => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    const dialog = useDialog();
    const [name, setName] = useState(props.name === 'VAR_NAME'? '' : props.name);

    return(
        <Form onSubmit={(evt) => {evt.preventDefault();}}>
			<Form.Group className="mb-3" controlId="formVariableName" style={{width: '80%', marginLeft: '5%', marginTop: '5px'}}>
				<Form.Label>Variable Name</Form.Label>
				<Form.Select onChange={(evt) => setName((evt as any).target.value as string)} value={name} style={{textTransform: 'uppercase', maxWidth: '70%'}}>
					<option  value="">Specify a variable name...</option>
					{props.variables.map(_var => 
						<option key={_var.varName} value={_var.varName}>{_var.varName}</option>)}
				</Form.Select>
			</Form.Group>
            <Button
                onClick={() => {
                    // Сlose the dialog and return the value
                    dialog.close({name: name, result: 'save'});
                }}
				style={{marginLeft: '40%', marginBottom: '5px'}}
				variant= 'success'
            >
                Save
            </Button>
        </Form>
    );
};


interface DialogLogicEditorProps {
	variableName?: string;
	variableType?: string;
    operator?: string
    value?: string
}

interface DialogLogicEditorResult {
    result: string;
    operator: string;
    value: string;
}


const DialogLogicEditor = (props: DialogLogicEditorProps) => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    const dialog = useDialog();
    const [comparisonValue, setComparisonValue] = useState(props.value?? '');
	const [operator, setOperator] = useState(props.operator?? '==');

    return(
        <Form onSubmit={(evt) => {evt.preventDefault();}} style={{marginLeft: '7px', marginRight: '7px'}}>
			<Row>
				<Col>
					<Form.Control type="text" defaultValue="If the value of" readOnly plaintext style={{marginTop: '5px', textAlign: 'center'}}/>
				</Col>
				<Col>
					<Form.Control type="text" defaultValue={props.variableName} readOnly style={{marginTop: '7px', textAlign: 'center'}}/>
				</Col>
				<Col>
					<Form.Group className="mb-3" controlId="formOperatorType" style={{marginTop: '7px'}}>
						<Form.Select value={operator} onChange={(evt) => setOperator((evt as any).target.value as string)} style={{textAlign: 'center'}}>
							{(props.variableType === "TIME" || props.variableType === "NUMBER" || props.variableType === "TIMESPAN") && <option value=">">is greater than</option>}
							{(props.variableType === "TIME" || props.variableType === "NUMBER" || props.variableType === "TIMESPAN") && <option value=">=">is greater than or equal to</option>}
							{(props.variableType === "TIME" || props.variableType === "NUMBER" || props.variableType === "TIMESPAN") && <option value="<">ist less than</option>}
							{(props.variableType === "TIME" || props.variableType === "NUMBER" || props.variableType === "TIMESPAN") && <option value="<=">is less than or equal to</option>}
							<option value="==">is equal to</option>
							{(props.variableType !== "BOOLEAN") && <option value="!=">is not equal to</option>}
						</Form.Select>

					</Form.Group>
				</Col>
				<Col>
				<Form.Group className="mb-3" controlId="formValue" style={{marginTop: '7px'}}>
					{props.variableType === "BOOLEAN" && 
						<FormSelect value={comparisonValue} onChange={(evt) => setComparisonValue((evt as any).target.value as string)} style={{marginTop: '7px'}}>
							<option value="TRUE">TRUE</option>
							<option value="FALSE">FALSE</option>
						</FormSelect>}
					{props.variableType !== "BOOLEAN" &&
						<Form.Control type="text" defaultValue="TRUE" onChange={(evt) => setComparisonValue(evt.target.value)} value={comparisonValue} style={{ textAlign: 'center'}}/>}
					<Form.Text className="text-muted" id="_centeredFormText">
						<p className="text-center">(Comparison Value)</p>
					</Form.Text>
				</Form.Group>
				</Col>
			</Row>
			<Row className="justify-content-center">
				<Col lg="auto" md="auto" xs="auto">
					<Button
						onClick={() => {
							// Сlose the dialog and return the value
							dialog.close({operator: operator, value: comparisonValue, result: 'save'});
						}}
						style={{marginBottom: '5px', textAlign: 'center'}}
						variant= 'success'
					>
						Save
					</Button>
				</Col>
			</Row>
 
        </Form>
    );
};


export const extractOperatorAndValueFromTemplate = (template: string) => {
	const trimmedTemplate = template.replace("}}", "").replace(/"/g, "").trim();
	if(trimmedTemplate.startsWith(">=")) {
		return ["is greater than or equal to ", trimmedTemplate.substring(2).trim()];
	} else if(trimmedTemplate.startsWith("<=")) {
		return ["is less than or equal to ", trimmedTemplate.substring(2).trim()];
	} else if(trimmedTemplate.startsWith("==")) {
		if (trimmedTemplate.includes("DEFAULT")){
			return ["", "ELSE"];
		} else if (trimmedTemplate.substring(2).trim() === "TRUE"){
			return ["", "TRUE" ]
		} else if (trimmedTemplate.substring(2).trim() === "FALSE"){
			return ["", "FALSE" ]
		} else {
			return ["is equal to ", trimmedTemplate.substring(2).trim().toUpperCase()];
		}
	} else if(trimmedTemplate.startsWith("!=")) {
		return ["is not equal to ", trimmedTemplate.substring(2).trim().toLowerCase()];
	} else if(trimmedTemplate.startsWith("<")) {
		return ["is less than ", trimmedTemplate.substring(1).trim()];
	} else if(trimmedTemplate.startsWith(">")) {
		return ["is greater than ", trimmedTemplate.substring(1).trim()];
	}
	return ["ERRPR", "ERROR"];
}

export const extractOperatorAndValueFromTemplateForForm = (template: string) => {
	const trimmedTemplate = template.replace("}}", "").replace(/"/g, "").trim();
	if(trimmedTemplate.startsWith(">=")) {
		return [">=", trimmedTemplate.substring(2).trim()];
	} else if(trimmedTemplate.startsWith("<=")) {
		return ["<=", trimmedTemplate.substring(2).trim()];
	} else if(trimmedTemplate.startsWith("==")) {
		return ["==", trimmedTemplate.substring(2).trim()];
	} else if(trimmedTemplate.startsWith("!=")) {
		return ["!=", trimmedTemplate.substring(2).trim()];
	} else if(trimmedTemplate.startsWith("<")) {
		return ["<", trimmedTemplate.substring(1).trim()];
	} else if(trimmedTemplate.startsWith(">")) {
		return [">", trimmedTemplate.substring(1).trim()];
	}
	return ["ERRPR", "ERROR"];
}


export const extractVariableNameFromTemplate = (template: string) => {
	return template.replace("{{", "").trim();
}


const DialogLogicNode: React.FC<INode> = memo((props: INode) => {
	const changeNodeMarkup = useStoreActions((actions) => actions.changeNodeMarkup);
	const changeAnsweText = useStoreActions((actions) => actions.changeAnswerText);
	const addAnswer = useStoreActions((actions) => actions.addAnswer);

	const changeAnswerOrder = useStoreActions((actions) => actions.updateAnswerList);
	const [reOpenNode, setReopenNode] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const setSelectedElements = useFlowActions((actions) => actions.setSelectedElements);
	const unsetUserSelection = useFlowActions((actions) => actions.unsetUserSelection);
	const variables = useStoreState((state) => state.variables);
	const deleteAnswer = useStoreActions((actions) => actions.deleteAnswer);
	const setClickedAnswerId = useStoreActions((actions) => actions.setClickedAnswerId);

	const session = useStoreState((state) => state.session);
	const graphId = useStoreState((state) => state.graphId);
	const setShowServerErrorAlert = useStoreActions((actions) => actions.setShowServerErrorAlert);

	const onChangeNodeMarkup = useCallback(async () => {
		try {
			const varName = props.data.markup.replace("{{", "").trim()
			let result = await CustomDialog(
				<DialogVariableEditor name={varName} variables={variables}/>,
				{
				title: 'Specify a variable',
				showCloseIcon: true,
				}
			) as DialogVariableEditorResult;

			if(result.result === 'save') {
				const varType = variables.find(_var => _var.varName === result.name)!.varType;
				if(result.name !== varName) {
					// only take new value if string is not empty! otherwise, set default message
					changeNodeMarkup({session: session!, graphId: graphId, args: {nodeId: props.id, markup: `{{${result.name}`}}).then((res: boolean) => {
						if(!res) setShowServerErrorAlert(true);
					});
					if(varType === "BOOLEAN"){
						if (props.data.answers.length > 1){
							props.data.answers.filter(ans => !ans.text.includes("DEFAULT")).forEach(answer => deleteAnswer({session: session!, graphId: graphId, args: {nodeId:props.id, answerId:answer.id}}).then((res: boolean) => {
								if(!res) setShowServerErrorAlert(true);
							}));
						}
						addAnswer({session: session!, graphId: graphId, args: {id: createUniqueId(), nodeId: props.id, text: "== TRUE }}"}}).then((res: boolean) => {
							if(!res) setShowServerErrorAlert(true);
						})
					}
				}
			}
		}
		catch {}
	}, [addAnswer, changeNodeMarkup, deleteAnswer, props.data.answers, props.data.markup, props.id, variables, session, graphId, setShowServerErrorAlert]);

	const onAnswerDoubleClick = useCallback(async (evt: React.MouseEvent, answerId: string) => {
		evt.preventDefault();
		evt.stopPropagation();
		const answer = props.data.answers.find(answer => answer.id === answerId)!;
		const [operator, value] = extractOperatorAndValueFromTemplateForForm(answer.text);
		const varName = extractVariableNameFromTemplate(props.data.markup);
		const varType = variables.find(_var => _var.varName === varName)!.varType;
		try {
		let result = await CustomDialog(
				<DialogLogicEditor operator={operator} value={value} variableName={varName} variableType={varType}/>, // TODO fix: get real variable type
				{
				title: 'Specify Conditions',
				showCloseIcon: true,
				className: "logicEditor"
				}
			) as DialogLogicEditorResult;

			if(result.result === 'save') {
				if(result.operator.trim() !== operator || result.value.trim() !== value ) {
					// only take new value if string is not empty! otherwise, set default message
					if (varType === "LOCATION" || varType === "TEXT"){
						changeAnsweText({session: session!, graphId: graphId, args: {nodeId: props.id, answerId: answer.id, text: `${result.operator.trim()} "${result.value.trim()}"}}`}}).then((res: boolean) => {
							if(!res) setShowServerErrorAlert(true);
						});
					}
					else{
						changeAnsweText({session: session!, graphId: graphId, args: {nodeId: props.id, answerId: answer.id, text: `${result.operator.trim()} ${result.value.trim()}}}`}}).then((res: boolean) => {
							if(!res) setShowServerErrorAlert(true);
						});
					}
				}
			}
		}
		catch {}
	}, [changeAnsweText, props.data.answers, props.data.markup, props.id, variables, session, graphId, setShowServerErrorAlert]);


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

	const onRightClick = useCallback(() => {
		if(!props.selected) {
			setSelectedElements([]);
			unsetUserSelection();
			setSelectedElements([props]);
		}
	}, [setSelectedElements, unsetUserSelection, props]);

	const addNewAnswer = useCallback(() => {
		addAnswer({session: session!, graphId: graphId, args: {id: createUniqueId(), nodeId: props.id, text: "== VALUE }}"}}).then((res: boolean) => {
			if(!res) setShowServerErrorAlert(true);
		});
		
	}, [addAnswer, session, graphId, props.id, setShowServerErrorAlert]);

	return (
		<div id={props.id} onContextMenu={onRightClick}>
			<div><FontAwesomeIcon icon={faCodeBranch} color="#ffa216"/></div>
			<div className='leftConnector'/>
			<Handle
				type="target"
				className="leftConnectorHitbox"
				position={Position.Left}
				style={{ top: 'calc(7px + 50%)', width: '28px', height: '28px', left: '-14px', backgroundColor: 'transparent', borderColor: 'transparent' }}
				isConnectable={true}
			/>
			<FontAwesomeIcon onClick={() => setEditMode(!editMode)} icon={editMode? faMinus: faEdit} css={editNodeStyle(editMode)}/>
			{editMode && <h4 style={{backgroundColor: "#f0f0f0", borderBottom: "1px solid #e3e3e3", borderTop: "1px solid #e3e3e3", marginLeft: "-7px", paddingLeft: "7px", marginTop: "10px"}}>If:</h4>}
			<div className={variables.find(_var => _var.varName === extractVariableNameFromTemplate(props.data.markup)) ? "logic-variable" : "logic-variable-unfilled"}>
				<p className="variable-text" onDoubleClick={onChangeNodeMarkup}>
					{extractVariableNameFromTemplate(props.data.markup)}
				</p>
			</div>

			{
				props.data.answers.filter(answer => !answer.text.includes("DEFAULT")).map((answer: IAnswer, index) => {
					const [operator, value] = extractOperatorAndValueFromTemplate(answer.text);
					return <div key={answer.id} css={answerStyle(editMode)} id={`ans_${answer.id}`}
							onDoubleClick={(event: React.MouseEvent) => {onAnswerDoubleClick(event, answer.id)}}
							onClick={() => {if(!editMode) {setClickedAnswerId(answer.id)}}}
						>
							<p className="else-text" id={`pans_${answer.id}`}>
								{operator}<b>{value}</b>
							</p>
						{ editMode && props.data.answers.length > 1 && <div style={{position: "absolute", right: "10px", top: "5px", zIndex: 100}}>
								{index > 0 && <FontAwesomeIcon icon={faAngleUp} css={answerMoveArrowStyle} onClick={(e) => {onReorder(index, "up")}}/>}
								{index < props.data.answers.length - 2 && <FontAwesomeIcon icon={faAngleDown} css={answerMoveArrowStyle} onClick={() => {onReorder(index, "down")}}/>}
								</div>}							
						<Handle
							type="source"
							id={answer.id}
							position={Position.Right}
							style={{width: '14px', height: '14px', top: '50%', right: '-9px'}}
							isConnectable={true}
						/>
					</div>
				})
			}
			{editMode && 
			 variables.find(_var => _var.varName === extractVariableNameFromTemplate(props.data.markup)) &&
			 variables.find(_var => _var.varName === extractVariableNameFromTemplate(props.data.markup))!.varType !== "BOOLEAN" && 
			 <Button style={{backgroundColor: '#0E6495', border: 'none', marginBottom: '1px'}} 
					 onClick={() => addNewAnswer()}
			 >
				 Condition
				<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faPlus}/>
			</Button>}
			{(props.data.answers.filter(answer => answer.text.includes("DEFAULT")).map(defaultAnswer => (
				<div onClick={() => {if(!editMode) {setClickedAnswerId(defaultAnswer.id)}}}>
					<div css={elseStyle(editMode)}>
						<p className="else-text"><b>Else</b></p>
						<Handle
										type="source"
										id={defaultAnswer.id}
										position={Position.Right}
										style={{width: '14px', height: '14px', top: '50%', right: '-9px'}}
										isConnectable={true}
									/>
					</div>
				</div>
			)))}

			{editMode && <h4 style={{backgroundColor: "#f0f0f0", marginTop: "5px", marginLeft: "-7px", paddingLeft: "7px"}}>Tags<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faTag}/></h4> }
			<AppliedTags tags={props.data.tags} nodeId={props.id} selected={editMode}/>
			
		</div>
	);
});

export default DialogLogicNode;
