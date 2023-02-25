/** @jsxImportSource @emotion/react */
import React, { useCallback, useEffect, useState } from "react";
import { iconStyle, playIconStyle } from "../lib/styles";
import { Button, OverlayTrigger, Tooltip, Alert, Dropdown, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUndo, faRedo, faSearch, faPlay, faPlus, faSync, faDownload, faTrashAlt, faSitemap, faHome} from '@fortawesome/free-solid-svg-icons';
import ReactFlow, { ArrowHeadType, Background, Connection, Controls, Edge, ElementId, Elements, getConnectedEdges, isEdge, MiniMap, Node, useStoreState as useFlowState, useStoreActions as useFlowActions, useZoomPanHelper, isNode } from "react-flow-renderer";
import { useStoreActions, useStoreState } from "../store/store";
import DialogNode from "./nodes/DialogNode";
import dagre from 'dagre';
import { htmlDecode } from "../lib/utils";
import FileImportButton, { IFileImportContent } from "./input/FileImportButton";
import { createUniqueId } from "../lib/utils";
import $ from 'jquery';
import useKeyboardShortcut from "./input/KeyShortcuts";
import Sidebar from "./sidebar/Sidebar";
import { StartNode } from "./nodes/StartNode";
import { systemPlaceholderMsg } from "../lib/labels";
import DialogInfoNode from "./nodes/DialogInfoNode";
import DialogInputNode from "./nodes/DialogInputNode";
import { ConnectionDeleteArgs, IAnswer, INode } from "../types";
import DialogLogicNode from "./nodes/DialogLogicNode";
import BezierEdge from "./edges/BezierEdge";
import ContextMenu from "./input/ContextMenu";
import autobahn from 'autobahn';
import DialogVariableUpdateNode from "./nodes/DialogVariableUpdateNode";

const nodeTypes = {
	startNode: StartNode,
	userResponseNode: DialogNode,
	infoNode: DialogInfoNode,
	userInputNode: DialogInputNode,
	logicNode: DialogLogicNode,
	variableUpdateNode: DialogVariableUpdateNode
};

const edgeTypes = {
	customBezierEdge: BezierEdge,
};

const getEdgeId = ({ source, sourceHandle, target, targetHandle }: Connection): ElementId =>
  `reactflow__edge-${source}${sourceHandle}-${target}${targetHandle}`;

const connectionExists = (edge: Edge, elements: Elements) => {
  return elements.some(
    (el) =>
      isEdge(el) &&
      el.source === edge.source &&
      el.target === edge.target &&
      (el.sourceHandle === edge.sourceHandle || (!el.sourceHandle && !edge.sourceHandle)) &&
      (el.targetHandle === edge.targetHandle || (!el.targetHandle && !edge.targetHandle))
  );
};



const dagreGraph = new dagre.graphlib.Graph({directed: true});
dagreGraph.setDefaultEdgeLabel(() => ({}));


const DialogEditor = () => {
	const server = useStoreState((state) => state.server);
	const session = useStoreState((state) => state.session);
	const setServer = useStoreActions((actions) => actions.setServer);
	const setSession = useStoreActions((actions) => actions.setSession);
	const graphId = useStoreState((state) => state.graphId);

	const nodes = useStoreState((state) => state.nodes);
	const connections = useStoreState((state) => state.connections);
	const tags = useStoreState((state) => state.tagList);
	const undoStackSize = useStoreState((state) => state.undoStack.length);
	const redoStackSize = useStoreState((state) => state.redoStack.length);
	
	const addNode = useStoreActions((actions) => actions.addNode);
	const deleteNode = useStoreActions((actions) => actions.deleteNode);
	const changeNodePosition = useStoreActions((actions) => actions.changeNodePosition);
	
	const addConnection = useStoreActions((actions) => actions.addConnection);
	const deleteConnection = useStoreActions((actions) => actions.deleteConnection);
	
	const undo = useStoreActions((actions) => actions.undo);
	const redo = useStoreActions((actions) => actions.redo);

	const importNodes = useStoreActions((actions) => actions.importNodes);
	const importConnections = useStoreActions((actions) => actions.importConnections);
	const importTags = useStoreActions((actions) => actions.importTags);
	const importDataTables = useStoreActions((actions) => actions.importDataTables);
	const startNode = useStoreState((state) => state.startNode);

	const [isDeleteModeOn, toggleDeleteMode] = useState(false);

	const variables = useStoreState((state) => state.variables);

	const showServerErrorAlert = useStoreState((state) => state.showServerErrorAlert);
	const setShowServerErrorAlert = useStoreActions((actions) => actions.setShowServerErrorAlert);

	const setShowDebug = useStoreActions((actions) => actions.setShowDebugMenu);
	const startDialog = useStoreActions((actions) => actions.restartDialog);

	const paneTransform = useFlowState(state => state.transform);
	const { fitView } = useZoomPanHelper();

	const [showSearchMenu, setShowSearchMenu] = useState(false);
	const visibleTags = useStoreState((state) => state.visibleTags);
	const [tagAlertDismissed, setTagAlertDismissed] = useState(false);
	const resetVisibleTags = useStoreActions((actions) => actions.resetVisibleTags);
	const [showSaveConfirmation, setSaveConfirmation] = useState(false);
	const [saveAlertText, setSaveAlertText] = useState("Saving...");
	const selectedElements = useFlowState(state => state.selectedElements);
	const setSelectedElements = useFlowActions(actions => actions.setSelectedElements);
	const unsetUserSelection = useFlowActions(actions => actions.unsetUserSelection);
	const [clipboard, setClipboard] = useState([] as string[]);
    const changeNodeType = useStoreActions((actions) => actions.changeNodeType);
	const deleteAnswer = useStoreActions((actions) => actions.deleteAnswer);
    const addAnswer = useStoreActions((actions) => actions.addAnswer);
    const changeNodeMarkup = useStoreActions((actions) => actions.changeNodeMarkup);
	const deleteFAQQuestion = useStoreActions((actions) => actions.deleteFAQQuestion);
	const [showMissingVarAlert, setShowMissingVarAlert] = useState(false);
	const setClickedAnswerId = useStoreActions((actions) => actions.setClickedAnswerId);
	const clickedAnswerId = useStoreState((state) => state._clickedAnswerId);
    const {setCenter} = useZoomPanHelper();
	const userId = (document.getElementById('useridtoken') as HTMLInputElement).value;
	const setSendEnabled = useStoreActions((actions) => actions.setSendEnabled);

	
	useEffect(() => {
		if(clickedAnswerId) {
			const connection = connections.find(conn => conn.sourceHandle === clickedAnswerId);
			if (connection){
				const node = nodes.find(n => n.id === connection.target)!;
				setCenter(node.position.x + 100, node.position.y + 100, 1);
				setSelectedElements(node);	
				setClickedAnswerId("");;
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clickedAnswerId]);

	const showtagAlert = useCallback(() => {
		return !showSearchMenu && visibleTags.length < tags.length + 1 && !tagAlertDismissed
	}, [showSearchMenu, tagAlertDismissed, tags.length, visibleTags.length]);

	// const [paneTransform, setPaneTransform] = useStore({x: 0, y: 0, zoom: 1.0});

	// const onMovePane = useCallback((flowTransform?: FlowTransform) => {
	// 	if(flowTransform) {
	// 	  setPaneTransform(flowTransform);
	// 	}
	// }, []);

	const onConnect = useCallback((params: Connection | Edge) => {
		if (!params.source || !params.target) {
			return [...nodes, ...connections];
		}
	
		let edge: Edge;
		if (isEdge(params)) {
			edge = { ...params };
		} else {
			edge = {
				...params,
				id: getEdgeId(params),
			} as Edge;
		}
	
		if (connectionExists(edge, connections as any)) {
			// don't add new connection if this one already exists
			return [...nodes, ...connections];
		}

		// Here, we first check if the Node Handle already is connected to another node.
		// If so, we delete the connection to the other node.
		// In the end, we add a new Edge.
		const fromNode = nodes.find(el => el.id === params.source)!; // find source node instance
		getConnectedEdges([fromNode], connections).forEach(edge => {
		  if(edge.source === fromNode.id && (params.sourceHandle? edge.sourceHandle === params.sourceHandle : true)) {
			deleteConnection({session: session!, graphId: graphId, args: {sourceNodeId: edge.source, sourceHandle: edge.sourceHandle} as ConnectionDeleteArgs}).then((res: boolean) => {
				if(!res) setShowServerErrorAlert(true);
			}); // find all connections already outgoing from the source handle
		  }
		});
	
		edge.id = createUniqueId();
		// edge.type = "smoothstep";
		edge.type = 'customBezierEdge';
		edge.arrowHeadType = ArrowHeadType.ArrowClosed;

		addConnection({session: session!, graphId: graphId, args: edge}).then((res: boolean) => {
			if(!res) setShowServerErrorAlert(true);
		});
	
		return [...nodes, ...connections];
	}, [addConnection, connections, deleteConnection, nodes, session, graphId, setShowServerErrorAlert]);

	const onAddNode = useCallback((nodeType: string, pos?: any) => {
		const id = new Date().getTime().toString() + Math.random().toString().substring(3,7);
		let position = {x: 0, y: 0};
		if (pos){
			const _x = (parseInt(pos.xPos) - paneTransform[0])/paneTransform[2];
			const _y = (parseInt(pos.yPos) - paneTransform[1])/paneTransform[2];
			position = {x: _x, y: _y}
		} else{
			position = { x: (150 - paneTransform[0])/paneTransform[2], y: (150 - paneTransform[1])	/paneTransform[2]};
		}
		let node = {
			id: id,
			type: nodeType,
			selected: false,
			data: {
				id: id, 
				markup: systemPlaceholderMsg,
				raw_text: htmlDecode(systemPlaceholderMsg),
				answers: new Array<IAnswer>(),
				questions: [],
				tags: [],
				editMode: false
			},
			position: position,
		};
		if(nodeType === "userInputNode") {
			// variable node always has 1 answer
			node.data.answers.push({
				nodeId: id,
				id: createUniqueId(),
				text: "{{ VAR_NAME = NUMBER }}"
			});
		} else if(nodeType === "logicNode") {
			node.data.markup = "{{ VAR_NAME"
			node.data.answers.push({
				nodeId: id,
				id: createUniqueId(),
				text: " == DEFAULT }}"
			});
		} else if(nodeType === "variableUpdateNode") {
			node.data.markup = "VAR_NAME";
			node.data.raw_text = "VAR_NAME";
		}
		addNode({session: session!, graphId: graphId, args: node}).then((res: boolean) => {
			if(!res) setShowServerErrorAlert(true);
		});
	}, [addNode, paneTransform, session, graphId, setShowServerErrorAlert]);

	const getLayoutedElements = useCallback(() => {
		try {
		dagreGraph.setGraph({ rankdir: 'LR', ranksep: 100 });
			
		nodes.forEach((node) => {
			const nodeId = node.id === "0"? "START" : node.id;
			const bounds = document.getElementById(nodeId)!.getBoundingClientRect();
			dagreGraph.setNode(node.id, { width: bounds.width/paneTransform[2], height: bounds.height/paneTransform[2]});
		});
		connections.forEach((conn) => {
			dagreGraph.setEdge(conn.source, conn.target);
		});
	
		dagre.layout(dagreGraph);
	
		nodes.forEach((node) => {
			const nodeWithPosition = dagreGraph.node(node.id);
			const position = {
				x: nodeWithPosition.x - nodeWithPosition.width / 2,
				y: nodeWithPosition.y - nodeWithPosition.height / 2,
			};
			changeNodePosition({session: session!, graphId: graphId, args: {nodeId: node.id, position: position}}).then((res: boolean) => {
				if(!res) setShowServerErrorAlert(true);
			});
		});
		} catch(e) {
			console.log(e);
		}
	}, [changeNodePosition, connections, nodes, paneTransform, session, graphId, setShowServerErrorAlert]);

	const getMissingVariables = useCallback(() => {
		let usedVariables = new Set<string>();
		nodes.filter(node => node.type === "logicNode").forEach(logicNode => {
			usedVariables.add(logicNode.data.markup.replace("{{", "").trim());
		});
		return Array.from(usedVariables).filter(_var => !variables.map(varItem => varItem.varName).includes(_var))
	}, [nodes, variables])

	const onLoad = useCallback(async () => {
		let CSRFtoken = $('input[name=csrfmiddlewaretoken]').val();
		console.log("LOADIN Graph... token", CSRFtoken);

        $.post(`/data/load_graph/${graphId}`, { 
            csrfmiddlewaretoken: CSRFtoken,
			version: 1
        }).then((response) => {
			const data = JSON.parse(response);
			console.log("got response", data);
			if(data.nodes.length > 0) {
				// don't overwrite start node if no connection can be established
				importTags(data.tags);
				importNodes(data.nodes);
				importConnections(data.connections);
				importDataTables(data.dataTables);
			}
		});
	}, [importConnections, importNodes, importTags, graphId]);

	useEffect(() => {
		if(startNode) {
			console.log('start node found');
			fitView({ padding: 0.2, includeHiddenNodes: false });
			setTimeout(() => {startDialog(userId);}, 500);
			// setCenter(startNode!.position.x, startNode!.position.y, 1);
		}
	}, [startNode, fitView, startDialog, userId])

	const importFromFile = useCallback((fileContent: IFileImportContent) => {
		importTags(fileContent.tags);
		importNodes(fileContent.nodes);
		importConnections(fileContent.connections);
		importDataTables(fileContent.dataTables);
		if(session) {
			session.call("dialogdesigner.import", [fileContent], {});
		}
	}, [importConnections, importNodes, importTags, session]);
	

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const initialize = useEffect(() => {
		// const urlParams = new URLSearchParams(window.location.search);
		// const graphId = urlParams.get("graphId");
		console.log("passed graph id", graphId);

		if(!server) {
			// console.log("CREATE CONNECTION TO HOST", window.location.hostname);
			let server = new autobahn.Connection({
				url: `ws://router:8083/ws`,
				realm: "adviser"
			});
			server.onopen = function (session, details) {	
				console.log("Session established", details);
				setSession(session);
			}
			server.onclose = function(session, details) {
				console.log("Session closed", details);
				return true;
			}
			server.open();
			setServer(server)
		}
		onLoad();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onElementClick = useCallback((event: React.MouseEvent, element: Node | Edge) => {
		if(!isDeleteModeOn)
			return;
		
		try {
			const _id: string = (event.target as any).id;
			if(_id.startsWith("pans_")) {
				deleteAnswer({session: session!, graphId: graphId, args: {nodeId: element.id, answerId: _id.substring(5)}}).then((res: boolean) => {
					if(!res) setShowServerErrorAlert(true);
				});
				if(isDeleteModeOn)
					toggleDeleteMode(false);
				return;
			} else if(_id.startsWith("ans_")) {
				deleteAnswer({session: session!, graphId: graphId, args: {nodeId: element.id, answerId: _id.substring(4)}}).then((res: boolean) => {
					if(!res) setShowServerErrorAlert(true);
				});
				if(isDeleteModeOn)
					toggleDeleteMode(false);
				return;
			} else if(_id.startsWith("pfaq_")) {
				deleteFAQQuestion({session: session!, graphId: graphId, args: {nodeId: element.id, faqId: _id.substring(5)}}).then((res: boolean) => {
					if(!res) setShowServerErrorAlert(true);
				});
				if(isDeleteModeOn)
					toggleDeleteMode(false);
				return;
			}
			else if(_id.startsWith("faq_")) {
				deleteFAQQuestion({session: session!, graphId: graphId, args: {nodeId: element.id, faqId: _id.substring(4)}}).then((res: boolean) => {
					if(!res) setShowServerErrorAlert(true);
				});
				if(isDeleteModeOn)
					toggleDeleteMode(false);
				return;
			}
		} catch {
			// clicked something completely different
		}
		if(isEdge(element)) {
			deleteConnection({session: session!, graphId: graphId, args: {sourceNodeId: element.source, sourceHandle: element.sourceHandle} as ConnectionDeleteArgs}).then((res: boolean) => {
				if(!res) setShowServerErrorAlert(true);
			});
		} else if(isNode(element)) {
			if(element.type !== "startNode")
				deleteNode({session: session!, graphId: graphId, args: element.id}).then((res: boolean) => {
					if(!res) setShowServerErrorAlert(true);
				});
		}

		if(isDeleteModeOn)
			toggleDeleteMode(false);
	}, [isDeleteModeOn, deleteAnswer, deleteFAQQuestion, deleteConnection, deleteNode, graphId, session, setShowServerErrorAlert, toggleDeleteMode]);

	const deleteElements = useCallback(() => {
		selectedElements?.forEach(el => {
			let node = nodes.find(node => node.id === el.id);
			if (node && el.id !== "0") {
				deleteNode({session: session!, graphId: graphId, args: el.id}).then((res: boolean) => {
					if(!res) setShowServerErrorAlert(true);
				});
			}
		})
	}, [deleteNode, nodes, selectedElements, session, graphId, setShowServerErrorAlert]);

	const copyElements = useCallback(() => {
		setClipboard(selectedElements? selectedElements.map(el => el.id) : []);
	}, [selectedElements]);

	const pasteElements = useCallback(() => {
		let newNodes = new Array<INode>();
		clipboard.forEach(_id => {
			let node = nodes.find(node => node.id === _id)!;
			if (node && _id !== "0") {
				let newId = createUniqueId();
				let newNode = {
					id: newId,
					type: node.type,
					selected: true,
					data: {
						id: newId, 
						markup: node.data.markup,
						raw_text: htmlDecode(node.data.markup),
						answers: new Array<IAnswer>(),
						questions: [],
						tags: node.data.tags,
						editMode: false
					},
					position: {x: node.position.x + 100, y: node.position.y + 100},
					};
				node.data.answers.forEach(ans => {
					newNode.data.answers.push({nodeId: newId, id: createUniqueId(), text: ans.text})
				});
				addNode({session: session!, graphId: graphId, args: newNode}).then((res: boolean) => {
					if(!res) setShowServerErrorAlert(true);
				});
				newNodes.push(newNode);
			}
		setSelectedElements(newNodes);
		});
	}, [addNode, clipboard, nodes, setSelectedElements, setShowServerErrorAlert, session, graphId]);

	const _changeNodeType = useCallback((nodeType: string, nodeId: string) => {
        let node = nodes.find(node => node.id === nodeId)!;
        node.data.answers.forEach(ans => deleteAnswer({session: session!, graphId: graphId, args: {nodeId: nodeId, answerId: ans.id}}).then((res: boolean) => {
			if(!res) setShowServerErrorAlert(true);
		}));
        changeNodeType({session: session!, graphId: graphId, args: {nodeId: nodeId, nodeType: nodeType}}).then((res: boolean) => {
			if(!res) setShowServerErrorAlert(true);
		});

        if (nodeType === "logicNode"){
            changeNodeMarkup({session: session!, graphId: graphId, args: {nodeId: nodeId, markup: systemPlaceholderMsg}}).then((res: boolean) => {
				if(!res) setShowServerErrorAlert(true);
			});
			addAnswer(
				{session: session!, graphId: graphId, args: { 
					nodeId: nodeId,
					id: createUniqueId(),
					text: "== DEFAULT }}"
				}
			}).then((res: boolean) => {
				if(!res) setShowServerErrorAlert(true);
			});
        }

        if(nodeType === "userInputNode") {
			addAnswer(
				{session: session!, graphId: graphId, args: {
					nodeId: nodeId,
					id: createUniqueId(),
					text: "{{ VAR_NAME = NUMBER }}"
				}
			}).then((res: boolean) => {
				if(!res) setShowServerErrorAlert(true);
			});
		} else if(nodeType === "logicNode") {
			changeNodeMarkup({session: session!, graphId: graphId, args: {nodeId: nodeId, markup: "{{ VAR_NAME "}}).then((res: boolean) => {
				if(!res) setShowServerErrorAlert(true);
			});
		}
    }, [addAnswer, changeNodeMarkup, changeNodeType, deleteAnswer, nodes, session, graphId, setShowServerErrorAlert]);

	const _sortList = useCallback((objects: any) => {
		return objects.sort((a: any,b: any) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0))
	}, []);

	const takeMeHome = () => {
		let baseURL = window.location.host;
		console.log(baseURL);
	}

	useKeyboardShortcut(['Meta', 'F'], () => {setShowSearchMenu(true)}, true);
	useKeyboardShortcut(['Meta', 'Z'], undo, true);
	useKeyboardShortcut(['Meta', 'Y'], redo, true);
	// useKeyboardShortcut(['Meta', 'S'], onSave, true);
	useKeyboardShortcut(['Meta', "Backspace"], deleteElements, true);
	useKeyboardShortcut(['Meta', 'C'], copyElements, true);
	useKeyboardShortcut(['Meta', 'V'], pasteElements, true);


	// test whether this works on windows
	useKeyboardShortcut(['Control', 'F'], () => {setShowSearchMenu(true)}, true);
	useKeyboardShortcut(['Control', 'Z'], undo, true);
	useKeyboardShortcut(['Control', 'Y'], redo, true);
	// useKeyboardShortcut(['Control', 'S'], onSave, true);
	useKeyboardShortcut(['Control', "Backspace"],deleteElements, true);
	useKeyboardShortcut(['Control', 'C'], copyElements, true);
	useKeyboardShortcut(['Control', 'V'], pasteElements, true);

	// useKeyboardShortcut(['Shift', "Backspace"], () => {deleteElements()}, true);
	return (
		<>
			<div css={{position: 'fixed', left: 0, top: 0, zIndex: 100}}>
					<Dropdown as={ButtonGroup}>
						<OverlayTrigger placement='bottom' overlay={
							<Tooltip>
							Add a new node
							</Tooltip>
						}
						>
							<Button variant="success" onClick={() => onAddNode('userResponseNode')}><FontAwesomeIcon icon={faPlus}/></Button>
						</OverlayTrigger>
						<Dropdown.Toggle split variant="success" id="dropdown-split-basic" />
						<Dropdown.Menu>
							<Dropdown.Item onClick={() => onAddNode('userResponseNode')}>New Dialog Node</Dropdown.Item>
							<Dropdown.Item onClick={() => onAddNode('infoNode')}>New Information Node</Dropdown.Item>
							<Dropdown.Item onClick={() => onAddNode('userInputNode')}>New Variable Node</Dropdown.Item>
							<Dropdown.Item onClick={() => onAddNode('variableUpdateNode')}>New Variable Update Node</Dropdown.Item>
							<Dropdown.Item onClick={() => onAddNode('logicNode')}>New Logic Node</Dropdown.Item>
						</Dropdown.Menu>
						</Dropdown>

				<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Return to Graph Select
						</Tooltip>
					}
					>
					<Button variant="light" onClick={()=> {takeMeHome(); window.location.replace("http://" + window.location.host)}}><FontAwesomeIcon css={iconStyle()} icon={faHome}/></Button>
				</OverlayTrigger>

				{/* <OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Speichern
						</Tooltip>
					}
					>
					<Button variant="light" onClick={onSave} css={iconStyle()}><FontAwesomeIcon icon={faSave}/></Button>
				</OverlayTrigger> */}
				{/* <OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Load
						</Tooltip>
					}
					>
					<Button variant="light" onClick={onLoad}><FontAwesomeIcon css={iconStyle()} icon={faSync}/></Button>
				</OverlayTrigger> */}
				<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Delete Mode
						</Tooltip>
					}
					>
					{isDeleteModeOn?
					<Button variant="light" 
					    style={{color: 'red'}}
					 	onClick={() => toggleDeleteMode(!isDeleteModeOn)}><FontAwesomeIcon icon={faTrashAlt}/></Button>
					 : <Button variant="light" 
					 	onClick={() => toggleDeleteMode(!isDeleteModeOn)}><FontAwesomeIcon css={iconStyle()} icon={faTrashAlt}/></Button>
					}
				</OverlayTrigger>
				<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Export Graph
						</Tooltip>
					}
					>
					<a className="btn btn-light"
					href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify({'nodes': _sortList(nodes), 'connections': _sortList(connections), 'tags': _sortList(tags)}))}`}
					download="dialog_backup.json"><FontAwesomeIcon css={iconStyle()} icon={faDownload}/></a>
				</OverlayTrigger>

					<FileImportButton handleFileContent={importFromFile} />

				<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Undo
						</Tooltip>
					}
					>
					<Button variant="light" onClick={() => undo()}><FontAwesomeIcon css={iconStyle(undoStackSize > 0)} icon={faUndo}/></Button>
				</OverlayTrigger>
				<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Redo
						</Tooltip>
					}
					>
					<Button variant="light" onClick={() => redo()}><FontAwesomeIcon css={iconStyle(redoStackSize > 0)} icon={faRedo}/></Button>
				</OverlayTrigger>
				<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Use Autolayout
						</Tooltip>
					}
					>
					<Button variant="light"  onClick={getLayoutedElements}><FontAwesomeIcon css={iconStyle()} icon={faSitemap}/></Button>
				</OverlayTrigger>
				<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Open Search Menu
						</Tooltip>
					}
					>
					<Button variant="light" onClick={() => {setShowSearchMenu(!showSearchMenu)}}><FontAwesomeIcon css={iconStyle()} icon={faSearch}/></Button>
				</OverlayTrigger>
				<OverlayTrigger placement='bottom' overlay={
						<Tooltip>
						Open Test Chat
						</Tooltip>
					}
					>
					<Button variant="light" onClick={() =>{setShowDebug(); startDialog(userId); setTimeout(() => {setSendEnabled(true);}, 10);}}><FontAwesomeIcon css={playIconStyle()} icon={faPlay}/></Button>
				</OverlayTrigger>				
				{showSearchMenu && <Sidebar nodes={nodes} onHide={() => {setShowSearchMenu(false); setTagAlertDismissed(false);}}/>}
			</div>
			{showtagAlert() &&
						<Alert variant="warning" style={{float: "right", maxWidth:"30%"}} dismissible onClick={() => setTagAlertDismissed(true)}>
							<Alert.Heading>There are hidden nodes</Alert.Heading>
							To show all nodes in the tree, click on "Show all nodes"
							<br/>
							<br/>
							<Button variant="success" style={{display: "block", margin: "auto"}} onClick={() => {resetVisibleTags(visibleTags.length === tags.length + 1)}}>Show All Nodes</Button>
						</Alert>
			}
			{showMissingVarAlert &&
						<Alert variant="warning" style={{position: "absolute", left: "20px", maxWidth:"350px", zIndex:500}} dismissible onClose={() => setShowMissingVarAlert(false)}>
							<Alert.Heading>Variable nodes have been deleted without updating the logic nodes which depended on them</Alert.Heading>
							The following variables are affected: <br/>
							<ul>
								{getMissingVariables().map(_var => {return <li key={_var}>{_var}</li>})}
							</ul>

							The easiest way to solve this problem, is to search for each variable (using the search menu) to find the affected logic nodes and update them.
						</Alert>
			}			
			{showServerErrorAlert &&
						<Alert variant="danger" style={{position: "absolute", left: "20px", maxWidth:"350px", zIndex:500}} dismissible onClose={() => setShowServerErrorAlert(false)}>
							<Alert.Heading>Error</Alert.Heading>
							The action could not be executed because either
							<ul>
								<li>your quota was exceeded (100 nodes per graph, 10 answers per node, 10 tables per graph, text limit 1000 characters, 25 FAQs per node)</li>
								<li>the server is not reachable</li>
							</ul>
							Try deleting some nodes
						</Alert>
			}		
			<ReactFlow
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				elements={[...nodes as any, ...connections]}
				snapToGrid={true}
				snapGrid={[15, 15]}
				minZoom={0.05}
				style={{width: '100%', height: '100vh'}}
				// deleteKeyCode={46}
				// onLoad={() => fitView({ padding: 0.2, includeHiddenNodes: false })}
				onConnect={onConnect}
				onNodeDragStop={(event: React.MouseEvent, node: Node) => changeNodePosition({session: session!, graphId: graphId, args: {nodeId: node.id, position: node.position}}).then((res: boolean) => {
					if(!res) setShowServerErrorAlert(true);
				})}
				onElementClick={onElementClick}
				arrowHeadColor="#1899e9"
				onPaneContextMenu={() => {setSelectedElements([]); unsetUserSelection()}}
				// onMove={onMovePane}
				>
				<Controls />
				<MiniMap
					nodeColor={(node) => {
						return "lightblue";
					}
				}
				nodeStrokeWidth={3}
				/>
				<Background color="#aaa" gap={15} />
			</ReactFlow>
			{showSaveConfirmation && <Alert variant={saveAlertText === "Saving..." ? "warning": "success"} className="mb-0 mt-0" style={{zIndex:1100, position: "absolute", top: "2%", right: "0%", padding: 5}}>{saveAlertText}</Alert>}
			<ContextMenu clipboard={clipboard} onAddNode={onAddNode} copy={copyElements} paste={pasteElements} changeNodeType={_changeNodeType} selectedNodeIds={selectedElements?.map(el => el.id)}/>
		</>
		
	  );
};


export default DialogEditor;
