/** @jsxImportSource @emotion/react */
import { memo, useCallback, useEffect, useState } from "react";
import {
	Handle,
	Position,
  } from 'react-flow-renderer';
import { CustomDialog } from 'react-st-modal';
import NodeTextEditor, { NodeTextEditorResult } from '../input/NodeTextEditor';
import { INode } from "../../types";
import { htmlDecode } from "../../lib/utils";
import React from "react";
import { useStoreActions, useStoreState } from "../../store/store";
import { AppliedTags } from "../sidebar/TagSelect";
import { systemPlaceholderMsg } from "../../lib/labels";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faMinus, faTag } from "@fortawesome/free-solid-svg-icons";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { editNodeStyle } from "../../lib/styles";
import { useStoreActions as useFlowActions } from "react-flow-renderer";
import { FAQQuestionList } from "../input/FaqEditor";


const DialogInfoNode: React.FC<INode> = memo((props: INode) => {
	const changeNodeMarkup = useStoreActions((actions) => actions.changeNodeMarkup);
	
	const session = useStoreState((state) => state.session);
	const graphId = useStoreState((state) => state.graphId);
	const setShowServerErrorAlert = useStoreActions((actions) => actions.setShowServerErrorAlert);

	const [editMode, setEditMode] = useState(false);

	const setSelectedElements = useFlowActions((actions) => actions.setSelectedElements);
	const unsetUserSelection = useFlowActions((actions) => actions.unsetUserSelection);

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


	const onRightClick = useCallback(() => {
		if(!props.selected) {
			setSelectedElements([]);
			unsetUserSelection();
			setSelectedElements([props]);
		}
	}, [setSelectedElements, unsetUserSelection, props]);


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const updateNodeState = useEffect(() => {
		if(!props.selected) {
			setEditMode(false);
		}
	}, [props.selected, setEditMode]);

	return (
		<div id={props.id} onContextMenu={onRightClick} style={{minWidth:"50px"}}>
			<div><FontAwesomeIcon color="#1899e9" icon={faInfoCircle}/></div>
			<div className='leftConnector'/>
			<Handle
				type="target"
				className="leftConnectorHitbox"
				position={Position.Left}
				style={{ top: 'calc(7px + 50%)', width: '28px', height: '28px', left: '-14px', backgroundColor: 'transparent', borderColor: 'transparent' }}
				isConnectable={true}
			/>
			<Handle 
				type="source"
				id={props.id}
				position={Position.Right}
				style={{ top: '50%', width: '14px', height: '14px', right: '-7px' }}
				isConnectable={true}
			/>			
			<FontAwesomeIcon onClick={() => setEditMode(!editMode)} icon={editMode? faMinus: faEdit} css={editNodeStyle(editMode)}/>
			<p className="system-text" onDoubleClick={onChangeNodeMarkup}>
				{htmlDecode(props.data.markup)}
			</p>
			{ editMode && <h4 style={{backgroundColor: "#f0f0f0", borderBottom: "1px solid #e3e3e3", borderTop: "1px solid #e3e3e3", marginLeft: "-7px", paddingLeft: "7px"}}>FAQs</h4>}
			{ editMode && <FAQQuestionList nodeId={props.id} faqQuestions={props.data.questions} editMode={editMode}/>}
			{editMode && <h4 style={{backgroundColor: "#f0f0f0", marginTop: "5px", marginLeft: "-7px", paddingLeft: "7px"}}>Tags<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faTag}/></h4> }
			<AppliedTags tags={props.data.tags} nodeId={props.id} selected={editMode}/>

		</div>
	);
});

export default DialogInfoNode;
