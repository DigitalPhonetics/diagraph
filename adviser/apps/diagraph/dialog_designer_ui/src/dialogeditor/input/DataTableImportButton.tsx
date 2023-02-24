/** @jsxImportSource @emotion/react */
import { faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ChangeEvent } from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { iconStyle } from "../../lib/styles";
import { useStoreActions, useStoreState } from "../../store/store";
import { IDataTable } from "../../types";




const DataTableImportButton = () => {
  const hiddenFileInput = React.useRef<HTMLInputElement>(null);
  const setDataTable = useStoreActions((actions) => actions.setDataTable);
  const session = useStoreState((state) => state.session);
  const graphId = useStoreState((state) => state.graphId);
  
  const handleClick = () => {
    hiddenFileInput.current!.click();
  };
  const handleChange = async (event: ChangeEvent) => {
    const fileUploaded = hiddenFileInput.current!.files![0];
    const content = await fileUploaded.text();
    session!.call("dialogdesigner.datatable.import", [], {data: content, name: fileUploaded.name, graphId: graphId}).then(resp => {
        console.log("RESP", resp);
        if(resp !== false) {
          setDataTable(resp as IDataTable[]);
        }
        else {
          console.log("Error");
        }
    }).catch(err => console.log("Error", err));
  };
  return (
    <>
    	<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Import
						</Tooltip>
					}
				>
      <Button variant="light" css={iconStyle()} onClick={handleClick}>
        <FontAwesomeIcon icon={faUpload}/>
      </Button>
      </OverlayTrigger>
      <input type="file"
             ref={hiddenFileInput}
             onChange={handleChange}
             style={{display:'none'}} 
      /> 
    </>
  );
};

export default DataTableImportButton;