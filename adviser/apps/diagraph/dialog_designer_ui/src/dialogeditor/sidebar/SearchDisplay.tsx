import React, { useCallback } from "react";
import { ListGroup } from "react-bootstrap";
import { INode } from "../../types";
import  Fuse from "fuse.js";
import {useStoreActions, useZoomPanHelper} from "react-flow-renderer";
import { useStoreState } from "../../store/store";

export interface SearchDisplayProps {
    results: Fuse.FuseResult<INode>[];
    previewLength: number;
}

const searchResultTohighlightedSearchResult = (text: string, match_indices: readonly Fuse.RangeTuple[], previewLength: number) => {

    var nonOverlappingMatchSpans = new Array<[number, number]>();
    match_indices.forEach((i, index) => {
        if(index === 0) {
            nonOverlappingMatchSpans.push([i[0], i[1]]);
        } else {
            if(i[0] <= nonOverlappingMatchSpans[index-1][1] + 1 && i[1] > nonOverlappingMatchSpans[index-1][1]) {
                nonOverlappingMatchSpans[index-1][1] = i[1];
            } 
            else {
                nonOverlappingMatchSpans.push([i[0], i[1]]);
            }
        }
    });

    var output = [] as any;
    output.push(text.substring(Math.max(0, nonOverlappingMatchSpans[0][0] - previewLength - 1), nonOverlappingMatchSpans[0][0]));
    nonOverlappingMatchSpans.forEach((span, index) => {
        // substring is exclusive so need to use +1 everywhere
        output.push(<span key={index} style={{background: "#FFCA3A"}}>{text.substring(span[0], span[1]+1)}</span>);
        if(index < nonOverlappingMatchSpans.length - 1) {
            output.push(text.substring(span[1] + 1, nonOverlappingMatchSpans[index+1][0]));
        } else {
            output.push(text.substring(nonOverlappingMatchSpans[index][1] + 1, Math.min(nonOverlappingMatchSpans[index][1] + previewLength, text.length)));
        }
    });

    return output;
}

const SearchDisplay = (props: SearchDisplayProps) => {
    const setSelection = useStoreActions(actions => actions.setSelectedElements);
    const nodes = useStoreState(state => state.nodes);

    const {setCenter} = useZoomPanHelper(); 
    const jumpToNode = useCallback((x, y, id) => {
        setCenter(x + 100, y + 100, 1);
        setSelection(nodes.filter(node => node.id === id));
    }, [nodes, setCenter, setSelection]
    )

    return <ListGroup style={{maxHeight: "80vh", overflow: "scroll"}}>
        {
            props.results.map((result, index) => {
                let node = result.item;
                return <ListGroup.Item key={index} action onClick={() => {jumpToNode(node.position.x, node.position.y, node.id)}}>
                    {searchResultTohighlightedSearchResult(node.data.raw_text, result.matches![0].indices, props.previewLength)}
                </ListGroup.Item>
            })
        }
        </ListGroup>
}

export default SearchDisplay;