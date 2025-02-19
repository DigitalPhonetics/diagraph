import React from "react";
import { memo } from "react";
import { Handle, Position } from "react-flow-renderer";
import { INode } from "../../types";


export const StartNode = memo((props: INode) => {
	return (
		<div id="START">
			START
			<Handle
				type="source"
				id='0'
				position={Position.Right}
				style={{ width: '14px', height: '14px', top: '50%', right: '-9px'}}
				isConnectable={true}
			/>
		</div>
	);
});