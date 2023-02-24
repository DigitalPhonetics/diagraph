/** @jsxImportSource @emotion/react */
import { faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ChangeEvent } from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Edge } from "react-flow-renderer";
import { IDataTable, INode, ITag } from "../../types";
import { iconStyle } from "../../lib/styles";


export interface IFileImportContent {
  nodes: INode[];
  connections: Edge[];
  tags: ITag[];
  dataTables: IDataTable[];
}

interface FileImportButtonProps {
  handleFileContent: (content: IFileImportContent) => void;
}

const FileImportButton = (props: FileImportButtonProps) => {
  const hiddenFileInput = React.useRef<HTMLInputElement>(null);
  
  const handleClick = () => {
    hiddenFileInput.current!.click();
  };
  const handleChange = async (event: ChangeEvent) => {
    const fileUploaded = hiddenFileInput.current!.files![0];
    const content: IFileImportContent = JSON.parse(await fileUploaded.text());
    props.handleFileContent(content);
  };
  return (
    <>
    	<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Import Graph
						</Tooltip>
					}
				>
      <Button variant="light" onClick={handleClick}>
        <FontAwesomeIcon css={iconStyle()} icon={faUpload}/>
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

export default FileImportButton;