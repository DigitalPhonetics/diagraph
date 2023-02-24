import React, { useCallback } from "react";
import { ListGroup } from "react-bootstrap";
import { ILinkItem, INode } from "../../types";
import {useStoreActions, useZoomPanHelper} from "react-flow-renderer";
import { useStoreState } from "../../store/store";
import { htmlDecode } from "../../lib/utils";

const getLinks = (node: INode) => {
    let result = new Array<ILinkItem>();
    let match = ""
    const matching = node.data.markup.match(/(title=")(.*?)(?=" href)/g)!
    if (matching){
        matching.forEach((title) => {
            match = htmlDecode(title!.substring(7, title!.length));
            result.push({nodeId: node.id, posX: node.position.x, posY: node.position.y, linkText: match});
        });
    }
    return result
};


const LinkDisplay = () => {
    const nodes = useStoreState(state => state.nodes);
    const setSelection = useStoreActions(actions => actions.setSelectedElements);

    const {setCenter} = useZoomPanHelper(); 
    const jumpToNode = useCallback((x, y, id) => {
        setCenter(x + 100, y + 100, 1);
        setSelection(nodes.filter(node => node.id === id));
    }, [nodes, setCenter, setSelection]
    );
    let linkList = new Array<ILinkItem>();
    nodes.filter((node) =>  node.data.markup.includes('href')).forEach((node) => {
        linkList = linkList.concat(getLinks(node));
    })
    linkList.sort((a,b) => (a.linkText > b.linkText)? 1: -1);
    return <ListGroup style={{maxHeight: "80vh", overflow: "scroll"}}>
            {
                linkList.map((linkItem, index) => {
                    return <ListGroup.Item key={index} action onClick={() => {jumpToNode(linkItem.posX, linkItem.posY, linkItem.nodeId)}}>{linkItem.linkText}</ListGroup.Item>
                })
            }
            </ListGroup>
}

export default LinkDisplay;