/** @jsxImportSource @emotion/react */
import { faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useRef } from "react";
import { useCallback, useEffect, useState } from "react";
import { ListGroup, ListGroupItem, Overlay } from "react-bootstrap";
import { contextMenuStyle } from "../../lib/styles";
import { useStoreState, useStoreActions } from "../../store/store";


const ContextMenu = (props: {clipboard: string[], onAddNode: Function, copy: Function, paste: Function, changeNodeType: Function, selectedNodeIds?: string[]}) => {
	const undoStackSize = useStoreState((state) => state.undoStack.length);
	const redoStackSize = useStoreState((state) => state.redoStack.length);
    const undo = useStoreActions((actions) => actions.undo);
	const redo = useStoreActions((actions) => actions.redo);

    const changeNodeTarget = useRef(null);
    const createNewNodeTarget = useRef(null);
    const [showNodeTypes1, setShowNodeTypes1] = useState(false);
    const [showNodeTypes2, setShowNodeTypes2] = useState(false);
    const [xPos, setXPos] = useState("0px");
    const [yPos, setYPos] = useState("0px");
    const [showMenu, setShowMenu] = useState(false);
    const outerProps = props;

    const handleContextMenu = useCallback((e: any) => {
        setShowMenu(true);
        e.preventDefault();
        e.stopPropagation();
        setXPos(`${e.pageX}px`);
        setYPos(`${e.pageY}px`);
        },[setXPos, setYPos]);

    const handleClick = useCallback(() => {
        if (showMenu){
            setShowMenu(false);
            setShowNodeTypes1(false);
            setShowNodeTypes2(false);
        }

    }, [showMenu]);

    useEffect(() => {
        document.addEventListener("click", handleClick);
        document.addEventListener("contextmenu", handleContextMenu);
        return () => {
            document.addEventListener("click", handleClick);
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    });

    
    return <>{showMenu && 
        <ListGroup css={contextMenuStyle(xPos, yPos, document.body.clientHeight)} onMouseEnter={() => setShowMenu(true)}>
            {(undoStackSize > 0) && <ListGroupItem action onClick={() => undo()}>Undo</ListGroupItem> }
            {(redoStackSize > 0) &&  <ListGroupItem action onClick={() => redo()}>Redo</ListGroupItem> }
            {(props.selectedNodeIds?.length === 0 || (!props.selectedNodeIds)) && 
                <ListGroupItem action onClick={() => {props.onAddNode('userResponseNode', {xPos, yPos});}} onMouseEnter={() => {setShowNodeTypes2(true)}} onMouseLeave={() => {setShowNodeTypes2(false)}} ref={createNewNodeTarget}>
                    <div>Add new node <FontAwesomeIcon icon={faCaretRight} style={{position: "absolute", right: "5px", top: "12px"}}/></div>
                </ListGroupItem>}
            {/* {props.selectedNodeIds?.length === 1 &&
                <ListGroupItem action onClick={(evt) => {evt.preventDefault(); evt.stopPropagation();}} onMouseEnter={() => setShowNodeTypes1(true)} onMouseLeave={() => setShowNodeTypes1(false)} ref={changeNodeTarget}>
                    <div>Change node type<FontAwesomeIcon icon={faCaretRight} style={{position: "absolute", right: "5px", top: "12px"}}/></div>
                </ListGroupItem>
            } */}
            {(props.selectedNodeIds && props.selectedNodeIds?.length > 0) && <ListGroupItem action onClick={() => {props.copy()}}>Copy</ListGroupItem>}
            {props.clipboard.length > 0 && <ListGroupItem action onClick={() => {props.paste()}}>Paste</ListGroupItem>}
        </ListGroup>}
        <Overlay target={changeNodeTarget.current} show={showNodeTypes1} placement="right-start" >
        {({
          placement,
          scheduleUpdate,
          arrowProps,
          outOfBoundaries,
          show: _show,
          style,
          ...props}) => (
            <ListGroup onMouseEnter={() => {setShowNodeTypes1(true); setShowMenu(true)}} onMouseLeave={() => setShowNodeTypes1(false)} style={{...style, zIndex: 500}} {...props}>
                <ListGroupItem action onClick={() => {setShowNodeTypes1(false); outerProps.changeNodeType('userResponseNode', outerProps.selectedNodeIds![0])}}>Dialog Node</ListGroupItem>
                <ListGroupItem action onClick={() => {setShowNodeTypes1(false); outerProps.changeNodeType('infoNode', outerProps.selectedNodeIds![0])}}>Information Node</ListGroupItem>
                <ListGroupItem action onClick={() => {setShowNodeTypes1(false); outerProps.changeNodeType('userInputNode', outerProps.selectedNodeIds![0])}}>Variable Node</ListGroupItem>
                <ListGroupItem action onClick={() => {setShowNodeTypes1(false); outerProps.changeNodeType('variableUpdateNode', outerProps.selectedNodeIds![0])}}>Variable Update Node</ListGroupItem>
                <ListGroupItem action onClick={() => {setShowNodeTypes1(false); outerProps.changeNodeType('logicNode', outerProps.selectedNodeIds![0])}}>Logic Node</ListGroupItem>
            </ListGroup>)}
        </Overlay>
        <Overlay target={createNewNodeTarget.current} show={showNodeTypes2} placement="right-start">
        {({
          placement,
          scheduleUpdate,
          arrowProps,
          outOfBoundaries,
          show: _show,
          style,
          ...props
        }) => (
            <ListGroup onMouseEnter={() => {setShowNodeTypes2(true); setShowMenu(true)}} onMouseLeave={() => setShowNodeTypes2(false)}  style={{...style, zIndex: 500}}  {...props}>
                <ListGroupItem action onClick={() => {setShowNodeTypes2(false); outerProps.onAddNode('userResponseNode', {xPos, yPos})}}>Dialog Node</ListGroupItem>
                <ListGroupItem action onClick={() => {setShowNodeTypes2(false); outerProps.onAddNode('infoNode', {xPos, yPos})}}>Information Node</ListGroupItem>
                <ListGroupItem action onClick={() => {setShowNodeTypes2(false); outerProps.onAddNode('userInputNode', {xPos, yPos})}}>Variable Node</ListGroupItem>
                <ListGroupItem action onClick={() => {setShowNodeTypes2(false); outerProps.onAddNode('variableUpdateNode', {xPos, yPos})}}>Variable Update Node</ListGroupItem>
                <ListGroupItem action onClick={() => {setShowNodeTypes2(false); outerProps.onAddNode('logicNode', {xPos, yPos})}}>Logic Node</ListGroupItem>
            </ListGroup>)}
        </Overlay>
    </>

};

export default ContextMenu;