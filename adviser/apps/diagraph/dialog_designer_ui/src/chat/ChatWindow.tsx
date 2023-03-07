import React, { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import autobahn from 'autobahn';
import './chat.css';
// @ts-ignore
import { Parser} from 'html-to-react' 
import Accordion from 'react-bootstrap/Accordion';
import Table from 'react-bootstrap/Table';
import { useStoreActions, useStoreState } from '../store/store';
import { CloseButton } from 'react-bootstrap';
import { useZoomPanHelper } from "react-flow-renderer";


interface ChatMessage {
    text: string,
    nodeType: string,
}

// TODO add variable explorer - also allows to upload / inspect data

const ChatWindow = () => {
    const connectionRef = useRef<autobahn.Connection>();
    const sessionRef = useRef<autobahn.Session>();
    const [userMsg, setUserMsg] = useState("");
    const resetDialog = useStoreActions((actions) => actions.restartDialog);
    const startedOnce = useStoreState((state) => state.startedOnce);
    const chatHistory = useStoreState((state) => state.chatHistory);
    const addToChatHistory = useStoreActions((actions) => actions.addToChatHistory);
    const [beliefstate, setBeliefstate] = useState({} as Object);
    const [nodeId, setNodeId] = useState(0);
    const sendEnabled = useStoreState((state) => state.sendEnabled);
    const setSendEnabled = useStoreActions((actions) => actions.setSendEnabled);
    const graphId = new URLSearchParams(window.location.search).get("graphId");
    const userId = (document.getElementById('useridtoken') as HTMLInputElement).value; 
    const setHideDebugMenu = useStoreActions((actions) => actions.setHideDebugMenu);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const nodes = useStoreState((state) => state.nodes);
    const {setCenter} = useZoomPanHelper();
    const [nodePos, setNodePos] = useState({x: 0, y: 0 });

    useEffect(() => {
        setCenter(nodePos.x + 100, nodePos.y + 100, 1);
    }, [nodePos, setCenter])

    useEffect(() => {
        if(connectionRef.current === undefined) {
            // console.log("CREATE CONNECTION CHAT TO HOST", window.location.hostname);
            let server = new autobahn.Connection({
                url: `ws://${window.location.hostname}:8083/ws`,
                realm: "adviser"
            });
            server.onopen = function (session, details) {	
                console.log("Session established CHAT", details);
                session.subscribe(`sys_utterances.tree.${userId}`, (args, kwargs) => {
                    console.log("GOT MSG", args, kwargs);
                    kwargs['sys_utterances'].forEach((msg: string[]) => {
                        addToChatHistory({text: msg[0], nodeType: msg[1]} as ChatMessage);
                    });
                }, {match: "prefix"});
                session.subscribe(`node_id.tree.${userId}`, (args, kwargs) => {
                    console.log("GOT NODE ID", args, kwargs);
                    setNodeId(kwargs['node_id']);
                }, {match: "prefix"});
                session.subscribe(`node_pos.tree.${userId}`, (args, kwargs) => {
                    console.log("GOT NODE POS", args, kwargs);
                    setNodePos({x: kwargs['node_pos']['x'], y: kwargs['node_pos']['y']});
                }, {match: "prefix"});
                session.subscribe(`tree_end_reached.tree.${userId}`, (args, kwargs) => {
                    console.log("TREE END REACHED", kwargs['tree_end_reached']);
                    setSendEnabled(!kwargs['tree_end_reached']);
                }, {match: "prefix"});
                session.subscribe(`beliefstate.tree.${userId}`, (args, kwargs) => {
                    console.log("BELIEFSTATE", kwargs['beliefstate']);
                    setBeliefstate(kwargs['beliefstate']);
                }, {match: "prefix"});
                sessionRef.current = session;  
            }
            server.onclose = function(session, details) {
                console.log("Session closed CHAT", details);
                return true;
            }
            server.open();
            connectionRef.current = server;
        }
    }, [addToChatHistory, connectionRef, sessionRef, setSendEnabled, userId, setNodeId, setNodePos]); 

    useEffect(() => {
        const timer = setTimeout(() => {
            chatEndRef.current!.scroll({top: chatEndRef.current!.scrollHeight, behavior: "smooth"});
        }, 500);
    }, [chatHistory, chatEndRef])
    
    const sendMessage = useCallback(() => {
        if(userMsg.trim().length > 0) {
            if(sessionRef.current && sessionRef.current.isOpen) {
                console.log("SENDNING CHAT", userMsg);
                addToChatHistory({text: userMsg, nodeType: "user"} as ChatMessage);
                sessionRef.current.publish(`gen_user_utterance.${userId}`, [], {gen_user_utterance: userMsg, user_id: userId});
                sessionRef.current.publish(`graph_id.${userId}`, [], {graph_id: graphId, user_id: userId});
                // sessionRef.current.publish("node_id", [], {node_id: nodeId});
                setUserMsg("");
            }
        }
    }, [userMsg, addToChatHistory, userId, graphId]);

    const getSysMessageIcon = (nodeType: string) => {
        if(nodeType === "infoNode") {
            return <>
                <svg style={{position: "absolute", top: "0.25em", right: "0.25em"}} xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#004191" className="bi bi-info-circle-fill" viewBox="0 0 16 16">
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
                <br/><br/>
            </>
        } else if(nodeType === "errorMsg") {
            return <>
                <svg style={{position: "absolute", top: "0.25em", right: "0.25em"}} xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#C91A1A" className="bi bi-info-circle-fill" viewBox="0 0 512 512">
                    <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
                </svg>
                <br/>
            </>
        } else {
            return <>
                <svg style={{position: "absolute", top: "0.25em", right: "0.25em"}} xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#f58742" className="bi bi-question-circle-fill" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247zm2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>
                </svg>
                <br/>
            </>
        }
    }

    const renderSystemMessage = useCallback((msg: ChatMessage, key: number) => {
        return <div className="speech-bubble system" key={key}>
            <div className='systemMsg'>
                { getSysMessageIcon(msg.nodeType) }
                { Parser().parse(msg.text) }
            </div>
        </div>
    }, []);  

    const renderUserMessage = useCallback((msg: ChatMessage, key: number) => {
        return <div className="speech-bubble user" key={key}>
            <div className="message" style={{color: "anthrazit"}}>{msg.text}</div>
        </div>
    }, []);  

    const renderMessage = useCallback((msg: ChatMessage, key: number) => {
        return msg.nodeType === "user"? renderUserMessage(msg, key) : renderSystemMessage(msg, key);
    }, [renderSystemMessage, renderUserMessage]);


    const restart = useCallback(() => {
        console.log("RESTART DIALOG");
        console.log(" - user", userId);
        resetDialog(userId!)
        setTimeout(() => {setSendEnabled(true);}, 10);
    }, [resetDialog, setSendEnabled, userId]);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if(e.key === "Enter" && sendEnabled) {
            e.preventDefault();
            e.stopPropagation();
            sendMessage();
        }
    }, [sendEnabled, sendMessage]);
    
    const parseBelefstateValue = (beliefstate: Object, property: any) => {
        return beliefstate[property as keyof typeof beliefstate].toString();
    }


    return (
        <div style={{display: 'flex', flexFlow: "column", height: '100vh'}}>
            <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                <button type='button' className='btn btn-success' onClick={restart} style={{width: '150px', marginBottom: "0.25em", marginTop: "0.25em"}}>{startedOnce? "Restart" : "Start"}</button>
                {/* <button type='button' className='btn btn-warning' onClick={()=> window.location.replace("http://" + window.location.host + "/chat/survey")} style={{width: '125px', marginBottom: "0.25em", marginTop: "0.25em"}}>Take Survey</button> */}
                <CloseButton style={{marginRight: "0.25em", marginTop: "auto", marginBottom: "auto"}} onClick={() => {setHideDebugMenu()}}/>
            </div>
            <Accordion>
                <Accordion.Item eventKey="0">
                    <Accordion.Header>Chat Variables</Accordion.Header>
                    <Accordion.Body style={{padding: "0.5em"}}>
                    <Table striped bordered hover size="sm">
                        <thead>
                            <tr>
                                <th>Variable Name</th>
                                <th>Current Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            { Object.keys(beliefstate).map((item, index) => 
                                <tr key={index}>
                                    <td>{item}</td>
                                    <td>{parseBelefstateValue(beliefstate, item)}</td>
                                </tr>
                            )}
                        </tbody>
                        </Table>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
            <div id="messagelist" className="messagebox" style={{flexGrow: 1, maxHeight: "calc(100vh - 100px)", overflowY: "scroll"}} ref={chatEndRef}>
                { chatHistory.map((msg, index) => 
                    renderMessage(msg, index)
                )}
            </div>
            <div className="footer">
                <input id="userinput" placeholder="Enter your message here" style={{flex: 1, display: "block"}} value={userMsg} onChange={evt => setUserMsg(evt.target.value)} onKeyDown={onKeyDown}  />
                {sendEnabled? 
                    <button type="button" className="btn btn-primary" onClick={(e) => sendMessage()} style={{background: "#02beff", border: 0}}>Send</button> :
                    <button type="button" className="btn btn-primary" style={{background: "#02beff", border: 0}} disabled>Send</button>
                }
            </div>
        </div>
    );
};

export default ChatWindow;