import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { useStoreActions, useStoreState } from "../../store/store";
import DataTableImportButton from "../input/DataTableImportButton";
import { Accordion, Button, Form, InputGroup, ListGroup } from "react-bootstrap";
import { CustomDialog, useDialog } from "react-st-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt, faEdit } from '@fortawesome/free-solid-svg-icons';

interface DataTableNameEditorProps {
    initialName: string
}

export interface DataTableNameEditorResult {
    result: string;
    text: string;
}

export const DataTableNameEditor: React.FC<DataTableNameEditorProps> = (props: DataTableNameEditorProps): ReactElement => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    const dialog = useDialog();
    const [value, setValue] = useState(props.initialName?? '');
    useEffect(() => setValue(props.initialName ?? ''), [props.initialName]);

    return(
        <div>
            <Form.Label htmlFor="table-name">Table Name</Form.Label>
            <InputGroup className="mb-3">
                <Form.Control id="table-name" defaultValue={props.initialName} onChange={newValue => setValue(newValue.target.value)}/>
            </InputGroup>
            <Button
                onClick={() => {
                    // Сlose the dialog and return the value
                    dialog.close({text: value, result: 'save'});
                }}
            >
                save
            </Button>
        </div>
    );
};


const TableDisplay = () => {
    const dataTables = useStoreState(state => state.dataTables);
    const changeTableName = useStoreActions(actions => actions.changeDataTableName);
    const deleteTable = useStoreActions(actions => actions.deleteDataTable);

    const session = useStoreState((state) => state.session);
	const graphId = useStoreState((state) => state.graphId);
	const setShowServerErrorAlert = useStoreActions((actions) => actions.setShowServerErrorAlert);

    const onChangeTableName = useCallback(async (initialName: string) => {
		try {
			let result = await CustomDialog(
				<DataTableNameEditor initialName={initialName}/>,
				{
				title: 'Change Table Name',
				showCloseIcon: true,
				}
			) as DataTableNameEditorResult;

			if(result.result === 'save') {
				if(result.text !== initialName) {
					changeTableName({session: session!, graphId: graphId, args: {oldName: initialName, newName: result.text.trim()}}).then((res: boolean) => {
                        if(!res) setShowServerErrorAlert(true);
                    });
				}
			}
		}
		catch {}
	}, [changeTableName, session, graphId, setShowServerErrorAlert]);

    return <div style={{display: "flex", flexDirection: "column"}}>
        <DataTableImportButton/>
        <Accordion>
           { dataTables.map((table, index) => 
                <Accordion.Item eventKey={index.toString()} key={index}>
                    <Accordion.Header>
                        <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between ", flexGrow: 1.0}}>
                            {table.name}
                            <div>
                                <FontAwesomeIcon style={{paddingRight: "0.25em"}} icon={faEdit} onClick={() => onChangeTableName(table.name)}/>
                                <FontAwesomeIcon style={{paddingRight: "0.25em"}} icon={faTrashAlt} onClick={() => deleteTable(table.name)}/>
                            </div>
                        </div>
                    </Accordion.Header>
                    <Accordion.Body style={{padding: "0.5em"}}>
                        <ListGroup>
                            {
                                table.columns.map((column, index) => 
                                    <ListGroup.Item key={index}>{column}</ListGroup.Item>
                                )
                            }
                        </ListGroup>
                    </Accordion.Body>
                </Accordion.Item>
            )}
        </Accordion>
    </div>
}

export default TableDisplay;