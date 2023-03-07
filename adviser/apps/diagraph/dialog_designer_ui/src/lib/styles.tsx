/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react'

export enum NodeState {
    ACTIVE,
    INACTIVE,
}

export const NodeConfig = {
    background: {
        [NodeState.ACTIVE]: 'rgb(220,220,220)',
        [NodeState.INACTIVE]: 'rgb(255,255,255)'
    },
    highlightColor:  {
        [NodeState.ACTIVE]: 'rgb(95,165,255)',
        [NodeState.INACTIVE]: 'rgb(220,220,220)'
    },
    padding: 10,
    connectorDiameter: 15,
    initialPosition: {
        x: 15,
        y: 15
    }
}
export const connectorDiameter_half = NodeConfig.connectorDiameter / 2;

export const nodeBoxStyle = css({
    position: 'absolute',
    background: NodeConfig.background[NodeState.INACTIVE],
    border: `1px solid ${NodeConfig.highlightColor[NodeState.INACTIVE]}`,
    borderRadius: '3px',
    paddingLeft: `${NodeConfig.padding}px`,
    paddingTop: `${NodeConfig.padding}px`,
    paddingBottom: `${NodeConfig.padding}px`,
    paddingRight: `0px`,
    zIndex: 4,
    boxShadow: `0 0 10px ${NodeConfig.highlightColor[NodeState.INACTIVE]}`,
    ":hover": {
        background: NodeConfig.background[NodeState.ACTIVE]
    },
    ":active": {
        background: NodeConfig.background[NodeState.ACTIVE],
        borderColor: NodeConfig.highlightColor[NodeState.ACTIVE],
        boxShadow: `0 0 10px ${NodeConfig.highlightColor[NodeState.ACTIVE]}`
    }
});

export const editNodeStyle = (editable: boolean) => css({
    position: "absolute", 
    right: "7px", 
    top: "7px",
    ":hover": {
        cursor: "pointer",
        color: editable? "red" : "green"
    }
})

export const answerMoveArrowStyle = css({
    ":hover": {
        cursor: "pointer"
    }
});

export const answerStyle = (editable: boolean) =>  css({
        position: "relative",
        marginTop: "5px",
        marginLeft: "5px",
        marginRight: "1px",
        marginBottom: "5px",
        borderTop: "1px solid #d3d3d3",
        borderBottom: "1px solid #d3d3d3",
        borderLeft: "1px solid #d3d3d3",
        ":hover": {
            borderColor: editable? "#FFCA3A" : "#d3d3d3",
            backgroundColor: editable? "#FFCA3A" : "white",
            cursor: editable? "text" : "pointer"
        }
});

export const elseStyle = (editMode: boolean) =>  css({
    position: "relative",
    marginTop: "5px",
    marginLeft: "5px",
    marginRight: "1px",
    marginBottom: "5px",
    borderTop: "1px solid #d3d3d3",
    borderBottom: "1px solid #d3d3d3",
    borderLeft: "1px solid #d3d3d3",
    background: "#f0f0f0",
    ":hover": {
        cursor: editMode? "grab" : "pointer"
    }
});

export const answerBoxStyle = css({
    background: NodeConfig.background[NodeState.INACTIVE],
    border: `1px solid ${NodeConfig.background[NodeState.ACTIVE]}`,
    borderRadius: '3px',
    paddingLeft: `${NodeConfig.padding}px`,
    paddingTop: `${NodeConfig.padding}px`,
    paddingBottom: `${NodeConfig.padding}px`,
    marginBottom: `5px`,
    paddingRight: `0px`,
    zIndex: 5,
    height: `100%`,
    position: 'relative',
    ":hover": {
        background: 'lightgrey'
    }
});

export const contextMenuStyle = (xPos: string, yPos: string, yTotal: number) => {
    if (yTotal - parseInt(yPos, 10) < 200){
        return css({
            position: "absolute", 
            left: xPos,
            bottom: yTotal - parseInt(yPos, 10),
            zIndex: 500
        })
    } else{
        return css({
            position: "absolute", 
            left: xPos,
            top: yPos,
            zIndex: 500
        })
    }
};

export const iconStyle = (enabled: boolean = true) => css({
    ":hover": {
        color: enabled? "orange" : "grey"
    },
    color: enabled? "black": "grey"
});

export const playIconStyle = () => css({
    ":hover": {
        color: "orange"
    },
    color: "#157347"
})

export const tagVisibleStyle = (visible: boolean) => css({
    float: "right",
    marginLeft: '10px', 
    color: visible? 'blue' : 'black',
    ":hover": {
        cursor: "pointer"
    }
});

export const tagTrashStyle = css({
    float: "right",
    ":hover": {
        color: "red",
        cursor: "pointer"
    }
});


export const deleteIconStyle = (deleteMode: boolean) => css({
    color: deleteMode? 'red' : 'black',
    ":hover": {
        color: "orange"
    }
});

export const connectorStyle = css({
    position: 'absolute',
    zIndex: 6,
    background: NodeConfig.background[NodeState.INACTIVE],
    border: `2px solid ${NodeConfig.background[NodeState.ACTIVE]}`,
    borderRadius: '50%',
    display: 'inline-block',
    height: `${NodeConfig.connectorDiameter}px`,
    width: `${NodeConfig.connectorDiameter}px`,
    top: `calc(50% - ${connectorDiameter_half + NodeConfig.padding/4}px)`,
    left: `calc(100% - ${connectorDiameter_half + NodeConfig.padding/4}px)`,
    ":hover": {
        background: 'lightgrey'
    }
});

export const questionStyle = css({
    padding: `5px`,
    width: '300px'
});

export const editorStyle = css({
	width: '100vw',
	height: '100vh',
	// backgroundSize: '25px 25px',
	// backgroundImage: 'linear-gradient(to right, rgb(245,245,245) 1px, transparent 1px), linear-gradient(to bottom, rgb(245,245,245) 1px, transparent 1px)',
	zIndex: 1
});