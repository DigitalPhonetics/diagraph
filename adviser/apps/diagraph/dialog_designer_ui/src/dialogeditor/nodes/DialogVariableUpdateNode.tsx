/** @jsxImportSource @emotion/react */
import { memo, useCallback, useEffect, useState } from "react";
import {
	Handle,
	Position,
  } from 'react-flow-renderer';
import { CustomDialog, useDialog } from 'react-st-modal';
import {  INode, IVariable } from "../../types";
import {  Operation, parseFormulaFromText } from "../../lib/utils";
import React from "react";
import { useStoreActions, useStoreState } from "../../store/store";
import { AppliedTags } from "../sidebar/TagSelect";
import { Button, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faTag, } from "@fortawesome/free-solid-svg-icons";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { editNodeStyle } from "../../lib/styles";
import { useStoreActions as useFlowActions } from "react-flow-renderer";




interface DialogVariableEditorProps {
	existingVariables: IVariable[];
    lhsVarName?: string;
	op?: Operation;
	rhs1?: string;
	rhs2?: string;
	newVar?: boolean;
	varType?: string;
}

interface DialogVariableEditorResult {
    lhsVarName?: string;
	op?: Operation;
	rhs1?: string;
	rhs2?: string;
	result: string;
	newVar?: boolean;
	varType?: string;
}


const DialogVariableUpdateEditor = (props: DialogVariableEditorProps) => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    const dialog = useDialog();
    const [lhsVarName, setLhsVarName] = useState(props.lhsVarName);
	const [lhsVarType, setLhsVarType] = useState(props.lhsVarName? props.existingVariables.find(_var => _var.varName === props.lhsVarName)!.varType : undefined);
	const [op, setOp] = useState(props.op);
	const [rhs1, setRhs1] = useState(props.rhs1);
	const [rhs2, setRhs2] = useState(props.rhs2);
	const [newVar, setNewVar] = useState(props.newVar);


	const onLhsVarSelect = (evt: any) => {
		// select new lhs
		const newVarName = (evt as any).target.value as string;
		setLhsVarName(newVarName);
		setLhsVarType(props.existingVariables.find(_var => _var.varName === newVarName)!.varType);
		// empty all fields (rhs)
		setRhs1(undefined);
		setRhs2(undefined);
		setOp(undefined);
	}	

	const onOpSelect = (evt: any) => {
		const newOp = (evt as any).target.value === ""? undefined : (evt as any).target.value;
		if(newOp === undefined || newOp === "NEGATED")
			setRhs2(undefined);
		setOp(newOp);
	}

    return(
		<Form onSubmit={(evt) => {evt.preventDefault();}}>
		<div style={{display: "flex", flexDirection: "column"}}>
			{/* LHS */}
			<div>
				<Form.Check type="radio" label="Initialize new variable" checked={newVar}  onChange={(evt) =>{if(evt.target.value === "on") setNewVar(true)}}/>
				<Form.Check type="radio" label="Change existing variable" checked={!newVar} onChange={(evt) => {if(evt.target.value === "on") setNewVar(false)}}/>
				
				{newVar === true? <>
					<Form.Group className="mb-3" controlId="formVariableName" style={{width: '80%', marginLeft: '5%', marginTop: '5px'}}>
						<Form.Label>What name should be used to save the variable (cannot have spaces)?</Form.Label>
						<Form.Control type="text" placeholder="Choose new variable name..." onChange={(evt) => {setLhsVarName(evt.target.value.replace(" ", "").toUpperCase());}} value={lhsVarName} style={{textTransform: 'uppercase', maxWidth: '50%'}} />
						<Form.Text className="text-muted">
							(e.g., COUNTRY or COUNTER)
						</Form.Text>
					</Form.Group>
					<Form.Group className="mb-3" controlId="formVariableType" style={{width: '80%', marginLeft: '5%'}}>
						<Form.Label>Type of variable</Form.Label>
						<Form.Select value={lhsVarType} onChange={(evt) => setLhsVarType((evt as any).target.value as string)} style={{maxWidth: '50%'}}>
							<option value="">Choose Variable Type...</option>
							<option value="NUMBER">Number</option>
							{/* <option value="LOCATION">Location</option> */}
							{/* <option value="TIMESPAN">Duration</option> */}
							{/* <option value="TIMEPOINT">Time</option> */}
							<option value="BOOLEAN">Yes/No</option>
							{/* <option value="TEXT">Text</option> */}
						</Form.Select>
						<Form.Text className="text-muted">
							(e.g., Location or Time)
						</Form.Text>
					</Form.Group>
					</>
					:
					<Form.Group className="mb-3" controlId="lhsVarName" style={{width: '80%', marginLeft: '5%', marginTop: '5px'}}>
						<Form.Label>Variable Name</Form.Label>
						<Form.Select onChange={onLhsVarSelect} value={lhsVarName} style={{textTransform: 'uppercase', maxWidth: '70%'}}>
							<option  value="">Choose existing variable...</option>
							{
								props.existingVariables
								.filter(_var => _var.varType === "BOOLEAN" || _var.varType === "NUMBER")
								.map(_var => 
									<option key={_var.varName} value={_var.varName}>{_var.varName}</option>
							)}
						</Form.Select>
					</Form.Group>
				}
			</div>
			<datalist id="rhs1_values">
			{
				props.existingVariables
					.filter(_var => _var.varType === lhsVarType)
					.map(_var => 
						<option key={_var.varName} value={_var.varName}>{_var.varName}</option>
			)}
			</datalist>
			{lhsVarType && <>
				<div style={{display: "flex", flexDirection: "row"}}>
					{/* RHS 1 */}
					<input type="text" id="rhs1" className="form-control" list="rhs1_values" placeholder="VALUE OR VARIABLE NAME" value={rhs1} onChange={(evt) => setRhs1((evt as any).target.value)}/>
					{/* OP */}
					<Form.Select onChange={evt => onOpSelect(evt)} defaultValue="" value={op} style={{textTransform: 'uppercase', maxWidth: '70%'}}>
						{lhsVarType === "NUMBER"? <>
								<option value="">Choose Operator...</option>
								<option value="+">+</option>
								<option value="-">-</option>
								<option value="*">*</option>
								<option value="/">/</option>
							</>
							: <>
								<option value="AND">AND</option>
								<option value="OR">OR</option>
								<option value="NEGATED">NEGATED</option>
						</>}
					</Form.Select>
					{/* RHS 2 */}
					{op && op !== "NEGATED" && 
						<input type="text" id="rhs2" className="form-control" list="rhs1_values" placeholder="VALUE OR VARIABLE NAME" value={rhs2} onChange={(evt) => setRhs2((evt as any).target.value)}/>
					}
				</div>
			</>}
			
            <Button
                onClick={() => {
                    // Сlose the dialog and return the value
                    dialog.close({lhsVarName: lhsVarName, lhsVarType: lhsVarType, rhs1: rhs1, rhs2: rhs2, op: op, newVar: newVar, varType: lhsVarType, result: 'save'});
                }}
				style={{marginLeft: '40%', marginBottom: '5px'}}
				variant= 'success'
            >
                Save
            </Button>
		</div>
        </Form>
    );
};


const DialogVariableUpdateNode: React.FC<INode> = memo((props: INode) => {
	const [editMode, setEditMode] = useState(false);
	
	const changeNodeMarkup = useStoreActions((actions) => actions.changeNodeMarkup);
	const existingVariables = useStoreState((state) => state.variables);

	const session = useStoreState((state) => state.session);
	const graphId = useStoreState((state) => state.graphId);
	const setShowServerErrorAlert = useStoreActions((actions) => actions.setShowServerErrorAlert);

	const setSelectedElements = useFlowActions((actions) => actions.setSelectedElements);
	const unsetUserSelection = useFlowActions((actions) => actions.unsetUserSelection);

	const addVariable = useStoreActions((actions) => actions.addVariable);
	const updateVariable = useStoreActions((actions) => actions.updateVariable);

	const onChangeNodeMarkup = useCallback(async () => {
		try {
			console.log("RAW TEXT", props.data.raw_text);
			const parsedEquation = parseFormulaFromText(props.data.raw_text);
			console.log("PARSED EQ", parsedEquation);
			let result = await CustomDialog(
				// Parse equation
				<DialogVariableUpdateEditor existingVariables={existingVariables} {...parsedEquation}/>,
				{
				title: 'Specify a system message',
				showCloseIcon: true,
				}
			) as DialogVariableEditorResult;

			if(result.result === 'save') {
				let text = "";
				if(result.lhsVarName) {
					text += result.lhsVarName;
					if(result.rhs1) {
						text += result.newVar? `(${result.varType}) := ` : " = ";
						text += result.rhs1;
					} 
					if(result.op) {
						text += " " + result.op as string;
						if(result.rhs2) text += " " + result.rhs2;
					}
				}
				text = text.trim();
				if(!text) text = "VAR_NAME";
				if(text !== props.data.raw_text) {
					if(result.newVar && parsedEquation.newVar) {
						// update variable
						updateVariable({oldVarName: parsedEquation.lhsVarName!, varName: result.lhsVarName!, varType: result.varType!});
					} else {
						// add variable / increase var counter
						addVariable({varName: result.lhsVarName!, varType: result.varType!});
					}
					changeNodeMarkup({session: session!, graphId: graphId, args: {nodeId: props.id, markup: text}}).then((res: boolean) => {
						if(!res) setShowServerErrorAlert(true);
					});
				}
			}
		}
		catch {}
	}, [props.data.raw_text, props.id, existingVariables, changeNodeMarkup, session, graphId, updateVariable, addVariable, setShowServerErrorAlert]);


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
		<div id={props.id} onContextMenu={onRightClick} style={{minWidth:"75px"}}>
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
				{props.data.raw_text}
			</p>
			{editMode && <h4 style={{backgroundColor: "#f0f0f0", marginTop: "5px", marginLeft: "-7px", paddingLeft: "7px"}}>Tags<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faTag}/></h4> }
			<AppliedTags tags={props.data.tags} nodeId={props.id} selected={editMode}/>
		</div>
	);
});

export default DialogVariableUpdateNode;
