/** @jsxImportSource @emotion/react */
import { memo, useCallback, useEffect, useState } from "react";
import {
	Handle,
	Position,
  } from 'react-flow-renderer';
import { CustomDialog, useDialog } from 'react-st-modal';
import { IAnswer, INode } from "../../types";
import { extractVariableNameAndTypeFromTemplate, htmlDecode } from "../../lib/utils";
import React from "react";
import { useStoreActions, useStoreState } from "../../store/store";
import { AppliedTags } from "../sidebar/TagSelect";
import { systemPlaceholderMsg } from "../../lib/labels";
import { Button, Form } from "react-bootstrap";
import NodeTextEditor, { NodeTextEditorResult } from "../input/NodeTextEditor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAlignLeft, faArchive, faCalendarWeek, faHashtag, faMapMarkedAlt, faMinus, faTag, faToggleOff } from "@fortawesome/free-solid-svg-icons";
import { faEdit, faClock } from "@fortawesome/free-regular-svg-icons";
import { editNodeStyle } from "../../lib/styles";
import { useStoreActions as useFlowActions } from "react-flow-renderer";

interface DialogInputEditorProps {
    name?: string
    type?: string
}

interface DialogInputEditorResult {
    result: string;
    name: string;
    type: string;
}


const DialogInputEditor = (props: DialogInputEditorProps) => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    const dialog = useDialog();
    const [name, setName] = useState(props.name?? '');
	const [type, setType] = useState(props.type?? 'Zahl');

    return(
        <Form onSubmit={(evt) => {evt.preventDefault();}}>
			<Form.Group className="mb-3" controlId="formVariableName" style={{width: '80%', marginLeft: '5%', marginTop: '5px'}}>
				<Form.Label>What name should be used to save the user input (cannot have spaces)?</Form.Label>
				<Form.Control type="text" placeholder="Choose Variable name..." onChange={(evt) => {setName(evt.target.value.replace(" ", "").toUpperCase());}} value={name} style={{textTransform: 'uppercase', maxWidth: '50%'}} />
				<Form.Text className="text-muted">
					(e.g., COUNTRY or DURATION)
				</Form.Text>
			</Form.Group>
			<Form.Group className="mb-3" controlId="formVariableType" style={{width: '80%', marginLeft: '5%'}}>
				<Form.Label>Type of user input</Form.Label>
				<Form.Select value={type} onChange={(evt) => setType((evt as any).target.value as string)} style={{maxWidth: '50%'}}>
					<option value="NUMBER">Number</option>
					{/* <option value="LOCATION">Location</option> */}
					{/* <option value="TIMESPAN">Duration</option> */}
					{/* <option value="TIMEPOINT">Time</option> */}
					<option value="BOOLEAN">Yes/No</option>
					<option value="TEXT">Text</option>
				</Form.Select>
				<Form.Text className="text-muted">
					(e.g., Location or Time)
				</Form.Text>
			</Form.Group>
            <Button variant="success"
                onClick={() => {
                    // Сlose the dialog and return the value
                    dialog.close({name: name, type: type, result: 'save'});
                }}
				style={{marginLeft: '40%', marginBottom: '5px'}}
            >
                Save
            </Button>
        </Form>
    );
};


const DialogInputNode: React.FC<INode> = memo((props: INode) => {
	const [editMode, setEditMode] = useState(false);
	
	const changeNodeMarkup = useStoreActions((actions) => actions.changeNodeMarkup);
	const changeAnswerText = useStoreActions((actions) => actions.changeAnswerText);

	const session = useStoreState((state) => state.session);
	const graphId = useStoreState((state) => state.graphId);
	const setShowServerErrorAlert = useStoreActions((actions) => actions.setShowServerErrorAlert);

	const setSelectedElements = useFlowActions((actions) => actions.setSelectedElements);
	const unsetUserSelection = useFlowActions((actions) => actions.unsetUserSelection);
	const addVariable = useStoreActions((actions) => actions.addVariable);


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

	const onAnswerDoubleClick = useCallback(async (evt: React.MouseEvent, answerId: string) => {
		evt.preventDefault();
		evt.stopPropagation();
		try {
			const answer = props.data.answers.find(answer => answer.id === answerId)!;
			const [varName, varType] = extractVariableNameAndTypeFromTemplate(answer.text);
			let result = await CustomDialog(
				<DialogInputEditor name={varName.trim()} type={varType.trim()}/>,
				{
				title: 'Save the user input as a variable',
				showCloseIcon: true,
				}
			) as DialogInputEditorResult;

			if(result.result === 'save') {
				if(result.name.trim() !== varName || result.type.trim() !== varType ) {
					// only take new value if string is not empty! otherwise, set default message
					changeAnswerText({session: session!, graphId: graphId, args: {nodeId: props.id, answerId: answer.id, text: `{{${result.name.trim()}=${result.type.trim()}}}`}}).then((res: boolean) => {
						if(!res) setShowServerErrorAlert(true);
					});
					addVariable({varName: result.name.trim(), varType: result.type.trim()});
				}
			}
		}
		catch {}
	}, [changeAnswerText, props.data.answers, props.id, addVariable, session, graphId, setShowServerErrorAlert]);

	const onRightClick = useCallback(() => {
		if(!props.selected) {
			setSelectedElements([]);
			unsetUserSelection();
			setSelectedElements([props]);
		}
	}, [setSelectedElements, unsetUserSelection, props]);

	const displayIcon = useCallback((inputType: string) => {
		if (inputType === "NUMBER"){
			return <FontAwesomeIcon icon={faHashtag} color="#4518e9" style={{marginLeft: '5px'}}/>
		} else if (inputType === "LOCATION"){
			return <FontAwesomeIcon icon={faMapMarkedAlt} color="#4518e9" style={{marginLeft: '5px'}}/>
		} else if (inputType === "TIMESPAN"){
			return <FontAwesomeIcon icon={faCalendarWeek} color="#4518e9" style={{marginLeft: '5px'}}/>
		} else if (inputType === "TIMEPOINT"){
			return <FontAwesomeIcon icon={faClock} color="#4518e9" style={{marginLeft: '5px'}}/>
		} else if (inputType === "BOOLEAN"){
			return <FontAwesomeIcon icon={faToggleOff} color="#4518e9" style={{marginLeft: '5px'}}/>
		} else if (inputType === "TEXT"){
			return <FontAwesomeIcon icon={faAlignLeft} color="#4518e9" style={{marginLeft: '5px'}}/>
		}
	}, []);


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const updateNodeState = useEffect(() => {
		if(!props.selected) {
			setEditMode(false);
		}
	}, [props.selected, setEditMode]);

	return (
		<div id={props.id} onContextMenu={onRightClick} style={{minWidth:"75px"}}>
			<div>
				<FontAwesomeIcon icon={faArchive} color="#4518e9"/>
				{props.data.answers.length > 0 && displayIcon(extractVariableNameAndTypeFromTemplate(props.data.answers[0].text)[1].toUpperCase())}
			</div>
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
			{ editMode && <h4 style={{backgroundColor: "#f0f0f0", borderBottom: "1px solid #e3e3e3", borderTop: "1px solid #e3e3e3", marginLeft: "-7px", paddingLeft: "7px"}}>Variable</h4> }
			{
				props.data.answers.map((answer: IAnswer) => {
					return <div key={answer.id}>
						<Handle
							type="source"
							id={answer.id}
							position={Position.Right}
							style={{width: '14px', height: '14px', top: '50%', right: '-7px'}}
							isConnectable={true}
						/>
						<div className={editMode ? "variable-edit" : "variable"}
							onDoubleClick={(event: React.MouseEvent) => onAnswerDoubleClick(event, answer.id)}
						>
								<p className="variable-text">
									{extractVariableNameAndTypeFromTemplate(answer.text)[0].trim()}
								</p>
						</div>
					</div>
				})
			}
			{editMode && <h4 style={{backgroundColor: "#f0f0f0", marginTop: "5px", marginLeft: "-7px", paddingLeft: "7px"}}>Tags<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faTag}/></h4> }
			<AppliedTags tags={props.data.tags} nodeId={props.id} selected={editMode}/>
		</div>
	);
});

export default DialogInputNode;
