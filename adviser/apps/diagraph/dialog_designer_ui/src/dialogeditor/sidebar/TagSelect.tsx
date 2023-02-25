/** @jsxImportSource @emotion/react */
import {faPlus, faTrashAlt} from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { memo, useCallback, useRef, useState } from "react"
import {Button, CloseButton, FormControl, ListGroup, ListGroupItem, Overlay } from "react-bootstrap"
import { useStoreActions, useStoreState } from "../../store/store"
import { tagTrashStyle, tagVisibleStyle } from "../../lib/styles"

export interface CreateTagButtonProps {
    nodeId: string
}


const TagButton = (props: CreateTagButtonProps) => {
    const [tagFieldInput, setTagFieldInput] = useState("");
    const [showTagList, setShowTagList] = useState(false);  
    const graphId = useStoreState((state) => state.graphId);
    const session = useStoreState((state) => state.session);
    const targetRef = useRef(null);


    const tags = useStoreState((state) => state.tagList);
    const addNewTag = useStoreActions((actions) => actions.addNewTag);
    const applyTag = useStoreActions((actions)=> actions.applyTag);
    const colorArray = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#9E101C', '#EB860A', '#06BAD6', '#0E6495', '#c3c3c3', '#7b3e19']

    const attachTag = useCallback((tag: string) => {
        applyTag({graphId: graphId, session: session!, args: {nodeId: props.nodeId, tagId: tag}});
        setShowTagList(false);
        setTagFieldInput("");
    }, [applyTag, graphId, session, props.nodeId, setShowTagList, setTagFieldInput])

    const attachNewTag = useCallback(() => {
        const colorIndex = tags.length % colorArray.length;
        const color = colorArray[colorIndex];
        addNewTag({graphId: graphId, session: session!, args: {id: tagFieldInput, color: color}});
        applyTag({graphId: graphId, session: session!, args: {nodeId: props.nodeId, tagId: tagFieldInput}});
        setShowTagList(false);
        setTagFieldInput("");
    }, [tags, colorArray, addNewTag, applyTag, graphId, session, tagFieldInput, setShowTagList, setTagFieldInput])

    return <div>
            <Button style={{backgroundColor: '#EB860A', border: "none", marginBottom: '1px'}} ref={targetRef} onClick={() => setShowTagList(!showTagList)}>Tag<FontAwesomeIcon style={{marginLeft: "10px"}} icon={faPlus}/></Button>
            <Overlay placement="right-start" show={showTagList} target={targetRef.current}>
                <div style={{maxHeight: "30vh", overflow: "scroll", zIndex: 100}}>
                    <FormControl
                        autoFocus={true}
                        type={"search"}
                        className={"mr-2"}
                        aria-label={"Specify Tag"}
                        placeholder={"Specify Tag"}
                        onChange={(e) => {setTagFieldInput(e.target.value.trim())}}
                    />
                    <ListGroup>
                        {
                        tags.filter(tag => tag.id.toLowerCase().includes(tagFieldInput.toLowerCase().trim())).map(tag => {
                            return <ListGroupItem key={tag.id} action onClick={() => attachTag(tag.id)}>{tag.id}</ListGroupItem>
                        })}
                        {(tags.filter(tag => tag.id === tagFieldInput).length === 0 && tagFieldInput && <ListGroupItem action onClick={() => {attachNewTag(); setShowTagList(!showTagList)}}>{`Neuen Tag '${tagFieldInput}' erstellen`}</ListGroupItem>)}
                    </ListGroup> 
                </div>
            </Overlay>
        </div>
}





export interface AppliedTagsProps {
    tags: string[],
    nodeId: string,
    selected: boolean
}

export const AppliedTags = memo((props: AppliedTagsProps) => {
    const allTags = useStoreState((state) => state.tagList);
    const detachTag = useStoreActions((action) => action.detachTag);
    const graphId = useStoreState((state) => state.graphId);
    const session = useStoreState((state) => state.session);

    return <>
        {props.tags.map(tag => {
            if (allTags.find(t => t.id === tag)) {
                const tagColor =  allTags.find(t => t.id === tag)!.color;
                return <span key={tag} style={{float: "left", backgroundColor: tagColor, borderRadius: 5, paddingLeft: 5, paddingRight: 5, margin: 2, color: "white"}}>
                    {props.selected && <CloseButton variant='white' style={{width: '3px', height: '3px', marginLeft: '3px', marginTop: '6px', float: "right"}} onClick={() => detachTag({graphId: graphId, session: session!, args: {nodeId: props.nodeId, tagId: tag}})}/>}
                    {tag}
                </span>
            } else {
                return <></>;
            }

        })}
        {props.selected && <TagButton nodeId={props.nodeId}/>}
    </>
});

export const TagFilterOptions = () => {
    const tags = useStoreState((state) => state.tagList);
    const deleteTag = useStoreActions((actions) => actions.deleteTag);
    const visibleTags = useStoreState((state) => state.visibleTags);
    const isVisible = useCallback((tagId: string) => visibleTags.includes(tagId), [visibleTags]);
    const toggleTag = useStoreActions((actions) => actions.toggleTag);
    const resetVisibleTags = useStoreActions((actions) => actions.resetVisibleTags);
    const graphId = useStoreState((state) => state.graphId);
    const session = useStoreState((state) => state.session);

    return <ListGroup style={{maxHeight: "80vh", overflow: "scroll"}} variant="flush">
                <ListGroup.Item variant="secondary">
                    <b>Toggle All Tags</b>
                    <span css={tagVisibleStyle(visibleTags.length === tags.length + 1)} onClick={() => resetVisibleTags(visibleTags.length === tags.length + 1)}><i className={(visibleTags.length === tags.length + 1)? "bi bi-eye" : "bi bi-eye-slash"}/></span></ListGroup.Item>
                {tags.map(tag => {
                    return <ListGroup.Item key={tag.id}>
                                {tag.id} 
                                <span css={tagVisibleStyle(isVisible(tag.id))} onClick={() => toggleTag(tag.id)}><i className={isVisible(tag.id) ? "bi bi-eye" : "bi bi-eye-slash"}/></span>
                                <span css={tagTrashStyle} onClick={() => deleteTag({graphId: graphId, session: session!, args: tag.id})}><FontAwesomeIcon icon={faTrashAlt}/></span>
                            </ListGroup.Item>})} 
                <ListGroup.Item>
                    Nodes without tag
                    <span css={tagVisibleStyle(isVisible("no Tag"))} onClick={() => toggleTag("no Tag")}><i className={isVisible("no Tag")? "bi bi-eye" : "bi bi-eye-slash"}/></span>
                </ListGroup.Item>
           </ListGroup>

}

export default TagButton;