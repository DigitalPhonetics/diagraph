import { AnswerDeleteArgs, AnswerTextChangeArgs, TagsArgs, IAnswer, INode, ITag, NodeMarkupChangeArgs, NodePositionChangArgs, AnswerListChangeArgs, ChangeNodeTypeArgs, IFAQQuestion, FAQQuestionChangeArgs, FAQQuestionDeleteArgs, IVariable, IVariableUpdateArgs, IVariableAddArgs, IDataTable, DataTableNameChangeArgs, ThunkArgs, ConnectionDeleteArgs, FnArgs, UndoArgs } from "../types";
import { action, Action, createStore, createTypedHooks, thunk, Thunk } from "easy-peasy";
import { ArrowHeadType, Edge } from "react-flow-renderer";
import { extractVariableNameAndTypeFromTemplate, parseFormulaFromText } from "../lib/utils";
import autobahn from 'autobahn';
import { map } from "jquery";
import { UndoMode } from "../constants";



interface StoreProps {
	nodes: INode[];
	connections: Edge[];
	variables: IVariable[];
	tagList: ITag[];
	visibleTags: string[];
	dataTables: IDataTable[];
	server?: autobahn.Connection;
	session?: autobahn.Session;
	graphName: string;
	graphId: string;
	userId?: string;
	showServerErrorAlert: boolean;
	startedOnce: boolean
	recordingGroup: UndoArgs[];
	isRecordingGroup: number;
}

interface ChatMessage {
    text: string,
    nodeType: string,
}

function markupToRawText(markup: string) {
	return markup.replace(/<[^>]+>/g, '');
}

function addNewTagReversible(state: StoreProps, args: FnArgs) {
	if(!(state.tagList as ITag[]).find(tag => tag.id === args.tagId!)) {
		(state.tagList as ITag[]).push(args.tag!);
		state.visibleTags.push(args.tagId!);
	}
	if(args.tagNodeIds) {
		args.tagNodeIds.forEach(nodeId => {
			state.nodes.find(node => node.id === nodeId)!.data.tags.push(args.tagId!);
		});
	}
}

function deleteTagReversible(state: StoreProps, args: FnArgs) {
	state.tagList = (state.tagList as ITag[]).filter(tag => tag.id !== args.tagId!);
	state.visibleTags = state.visibleTags.filter(tagId => tagId !== args.tagId!);
	state.nodes.forEach(node => {
		node.data.tags = node.data.tags.filter(tagId => tagId !== args.tagId!);
	})
}

function applyTagReversible(state: StoreProps, args: FnArgs) {
	let node = state.nodes.find(node => node.id === args.nodeId)!;
	if(!node.data.tags.find(tag => tag === args.tagId!)) {
		node.data.tags.push(args.tagId!);
	}
}

function detachTagReversible(state: StoreProps, args: FnArgs) {
	let node = state.nodes.find(node => node.id === args.nodeId!)!;
	node.data.tags = node.data.tags.filter(tag => tag !== args.tagId!);
}

function addVariableReversible(state: StoreProps, args: FnArgs) {
	let varDef = state.variables.find(_var => _var.varName === args.varName!);
	if(varDef) {
		varDef.count += 1;
	} else {
		state.variables.push({
			varName: args.varName!,
			varType: args.varType!,
			count: 1
		});
	}
}

function removeVariableReversible(state: StoreProps, args: FnArgs) {
	let varDef = state.variables.find(_var => _var.varName === args.varName!);
	if(varDef) {
		varDef.count -= 1;
		if(varDef.count === 0) {
			state.variables = state.variables.filter(_var => _var.varName !== args.varName!);
		}
	}	
}

interface StoreModel  {
	undoStack: Array<Array<UndoArgs>>;
	redoStack: Array<Array<UndoArgs>>;

	userId?: string;
	graphName: string;
	graphId: string;

	nodes: INode[];
	connections: Edge[];
	variables: IVariable[];

	server?: autobahn.Connection;
	session?: autobahn.Session;

	setServer: Action<StoreModel, autobahn.Connection>;
	setSession: Action<StoreModel, autobahn.Session>;

	renameGraph: Action<StoreModel, string>;

	addNode: Thunk<StoreModel, ThunkArgs<INode>, boolean>;
	_addNode: Action<StoreModel, INode>;
	changeNodeMarkup: Thunk<StoreModel, ThunkArgs<NodeMarkupChangeArgs>, boolean>;
	_changeNodeMarkup: Action<StoreModel, NodeMarkupChangeArgs>;
	changeNodePosition: Thunk<StoreModel, ThunkArgs<NodePositionChangArgs>, boolean>;
	_changeNodePosition: Action<StoreModel, NodePositionChangArgs>;
	changeNodeType: Thunk<StoreModel, ThunkArgs<ChangeNodeTypeArgs>, boolean>;
	_changeNodeType: Action<StoreModel, ChangeNodeTypeArgs>;
	deleteNode: Thunk<StoreModel, ThunkArgs<string>, boolean>;
	_deleteNode: Action<StoreModel, INode>;

	addAnswer: Thunk<StoreModel, ThunkArgs<IAnswer>, boolean>;
	_addAnswer: Action<StoreModel, IAnswer>;
	changeAnswerText: Thunk<StoreModel, ThunkArgs<AnswerTextChangeArgs>, boolean>;
	_changeAnswerText: Action<StoreModel, AnswerTextChangeArgs>;
	deleteAnswer: Thunk<StoreModel, ThunkArgs<AnswerDeleteArgs>, boolean>;
	_deleteAnswer: Action<StoreModel, AnswerDeleteArgs>;
	updateAnswerList: Thunk<StoreModel, ThunkArgs<AnswerListChangeArgs>, boolean>;
	_updateAnswerList: Action<StoreModel, AnswerListChangeArgs>;

	addVariable: Action<StoreModel, IVariableAddArgs>;
	updateVariable: Action<StoreModel, IVariableUpdateArgs>;

	addFAQQuestion: Thunk<StoreModel, ThunkArgs<IFAQQuestion>, boolean>;
	_addFAQQuestion: Action<StoreModel, IFAQQuestion>;
	deleteFAQQuestion: Thunk<StoreModel, ThunkArgs<FAQQuestionDeleteArgs>, boolean>;
	_deleteFAQQuestion: Action<StoreModel, FAQQuestionDeleteArgs>;
	changeFAQQuestion: Thunk<StoreModel, ThunkArgs<FAQQuestionChangeArgs>, boolean>;
	_changeFAQQuestion: Action<StoreModel, FAQQuestionChangeArgs>;

	addConnection: Thunk<StoreModel, ThunkArgs<Edge>, boolean>;
	_addConnection: Action<StoreModel, Edge>;
	deleteConnection: Thunk<StoreModel, ThunkArgs<ConnectionDeleteArgs>, boolean>;
	_deleteConnection: Action<StoreModel, Edge>;

	importNodes: Action<StoreModel, INode[]>;
	importConnections: Action<StoreModel, Edge[]>;
	importTags: Action<StoreModel, ITag[]>;
	importDataTables: Action<StoreModel, IDataTable[]>;
	startNode?: INode;

	undo: Thunk<StoreModel, void>;
	_undo: Action<StoreModel>;
	redo: Thunk<StoreModel, void>;
	_redo: Action<StoreModel>;
	recordAction: Action<StoreModel, UndoArgs>;
	recordingGroup: UndoArgs[];
	isRecordingGroup: number;
	beginRecordingGroup: Action<StoreModel, UndoMode | undefined>;
	endRecordingGroup: Action<StoreModel, UndoMode | undefined>;

	// tags
	tagList: ITag[];
	visibleTags: string[];
	addNewTag: Thunk<StoreModel, ThunkArgs<ITag>>;
	_addNewTag: Action<StoreModel, ITag>;
	deleteTag: Thunk<StoreModel, ThunkArgs<string>>;
	_deleteTag: Action<StoreModel, string>;
	applyTag: Thunk<StoreModel, ThunkArgs<TagsArgs>>;
	_applyTag: Action<StoreModel, TagsArgs>;
	detachTag: Thunk<StoreModel, ThunkArgs<TagsArgs>>;
	_detachTag: Action<StoreModel, TagsArgs>;
	toggleTag: Action<StoreModel, string>;
	resetVisibleTags: Action<StoreModel, boolean>;

	// data tables
	dataTables: IDataTable[];
	setDataTable: Action<StoreModel, IDataTable[]>;
	changeDataTableName: Thunk<StoreModel, ThunkArgs<DataTableNameChangeArgs>>;
	_changeDataTableName: Action<StoreModel, DataTableNameChangeArgs>;
	deleteDataTable: Action<StoreModel, string>;

	_clickedAnswerId: string;
	setClickedAnswerId: Action<StoreModel, string>;

	showServerErrorAlert: boolean;
	setShowServerErrorAlert: Action<StoreModel, boolean>;

	showDebugMenu: boolean;
	hideDebugMenu: boolean;
	setShowDebugMenu: Action<StoreModel>;
	setHideDebugMenu: Action<StoreModel>;

	restartDialog: Thunk<StoreModel, string>;
	startedOnce: boolean;
	setStartedOnce: Action<StoreModel, void>;
	chatHistory: ChatMessage[];
	addToChatHistory: Action<StoreModel, ChatMessage>;
	resetChatHistory: Action<StoreModel>;
	sendEnabled: boolean;
	setSendEnabled: Action<StoreModel, boolean>;
}



const initialStore: StoreModel = {
	nodes: [{id: "0", type: 'startNode', selected: false, data: { editMode: false, raw_text: "START", markup: "<p>START</p>", answers: [], questions: [], tags: []}, position: {x: 10, y: 150}}],
	undoStack: [],
	redoStack: [],
	connections: [],
	tagList: [],
	visibleTags: ["no Tag"],
	variables: [],
	dataTables: [],
	_clickedAnswerId: "",
	userId: "-1",
	graphName: "newgraph",
	graphId: new URLSearchParams(window.location.search).get("graphId")!,
	showServerErrorAlert: false,
	showDebugMenu: true,
	hideDebugMenu: false,
	startedOnce: false,
	chatHistory: [],
	sendEnabled: false,
	recordingGroup: [],
	isRecordingGroup: 0,

	setClickedAnswerId: action((state, payload) => {
		state._clickedAnswerId = payload;
	}),
	setShowServerErrorAlert: action((state, payload) => {
		state.showServerErrorAlert = payload;
	}),
	redo: thunk(async (actions, payload, {getState}) => {
		if(!getState().redoStack.length)
			return;
		
		const redoGroup = getState().redoStack[getState().redoStack.length - 1];
		actions._redo()
		actions.beginRecordingGroup(UndoMode.Undo);
		while(redoGroup.length > 0) {
			const op = redoGroup.pop()!;
			console.log("REDO OP", op);
			await op.inverseFn({graphId: getState().graphId, session: getState().session, args: op.undoArgs, actionMode: UndoMode.Undo});
		}
		actions.endRecordingGroup(UndoMode.Undo);
	}),
	undo: thunk(async (actions, payoad, {getState}) => {
		if(!getState().undoStack.length)
			return;
		
		const undoGroup = getState().undoStack[getState().undoStack.length - 1];
		actions._undo()
		actions.beginRecordingGroup(UndoMode.Redo);
		while(undoGroup.length > 0) {
			const op = undoGroup.pop()!;
			console.log("UNDO OP", op);
			await op.inverseFn({graphId: getState().graphId, session: getState().session, args: op.undoArgs, actionMode: UndoMode.Redo});
		}
		actions.endRecordingGroup(UndoMode.Redo);
	}),
	_redo: action((state) => {
		state.redoStack.pop();
	}),
	_undo: action((state) => {
		state.undoStack.pop();
	}),
	recordAction: action((state, payload) => {
		console.log("RECORDING ACTION", payload.fn.name);
		if(payload.actionMode === undefined) {
			state.redoStack = []; // clear redo stack if we execute a new action (neither undo nor redo)	
		}
		const mode = payload.actionMode === undefined? UndoMode.Undo : payload.actionMode;
		let recordingStack = mode === UndoMode.Undo? state.undoStack : state.redoStack;

		if(state.isRecordingGroup) {
			state.recordingGroup.push({...payload, actionMode: mode});
			console.log("- group", state.recordingGroup.length, state.recordingGroup);
		}
		else {
			if(recordingStack.length === 15) {
				recordingStack.shift();
			}			
			recordingStack.push([{...payload, actionMode: mode}]);
		}
	}),
	beginRecordingGroup: action((state, payload) => {
		state.isRecordingGroup = state.isRecordingGroup + 1;
		console.log("BEGIN RECORD GROUP", state.isRecordingGroup)
	}),
	endRecordingGroup: action((state, payload) => {
		const mode = payload === undefined? UndoMode.Undo : payload;
		state.isRecordingGroup = state.isRecordingGroup - 1;

		if(state.isRecordingGroup === 0) {
			// commit group to normal recording stack
			let recordingStack = mode === UndoMode.Undo? state.undoStack : state.redoStack;
			recordingStack.push(state.recordingGroup);
			state.recordingGroup = [];
		}

		console.log("END RECORD GROUP", state.isRecordingGroup)
	}),
	setServer: action((state, payload) => {
		state.server = payload;
	}),
	setSession: action((state, payload) => {
		state.session = payload;
	}),
	renameGraph: action((state, payload) => {
		if(state.session) {
			state.session.call("dialogdesigner.graph.rename", [], {graphId: state.graphId, newName: payload})
		}
		state.graphName = payload;
	}),
	addNode: thunk(async(actions, payload, {getState}) => {
		if(payload.session) {
			console.log("addNode");
			if(getState().nodes.find((node) => node.id === payload.args.id) !== undefined) return true;
			actions.beginRecordingGroup(payload.actionMode);
			const blank_node = { ...payload.args, data: {...payload.args.data, answers: [], questions: [], tags: []}};

			const success = await payload.session.call("dialogdesigner.node.add", [], {graphId: payload.graphId, node: blank_node}).then(async () => {
				actions._addNode(blank_node);
				actions.recordAction({fn: actions.addNode, inverseFn: actions.deleteNode, undoArgs: blank_node.id, redoArgs: blank_node, actionMode: payload.actionMode});
				
				const successes = await Promise.all(payload.args.data.answers.map(
					async (ans) => await actions.addAnswer({graphId: payload.graphId, session: payload.session, args: ans})
				));
				return successes.reduce((b1, b2) => b1 && b2, true);
			}).catch(() => false);
			actions.endRecordingGroup(payload.actionMode);
			return success;
		}
		return false;
	}),
	_addNode: action((state, payload) => {
		state.nodes.push(payload);
	}),
	changeNodePosition: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			return await payload.session.call("dialogdesigner.node.position.changed", [], {graphId: payload.graphId,  ...payload.args}).then(() => {
				let node = getState().nodes.find(node => node.id === payload.args.nodeId!)!;
				const oldPosition = {x: node.position.x, y: node.position.y};
				actions._changeNodePosition(payload.args);
				actions.recordAction({fn: actions.changeNodePosition, inverseFn: actions.changeNodePosition, undoArgs: {nodeId: node.id, position: oldPosition} as NodePositionChangArgs, redoArgs: {nodeId: node.id, position: payload.args.position} as NodePositionChangArgs, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
		}
		return false;
	}),
	_changeNodePosition: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		node.position = payload.position;
	}),
	deleteNode: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			console.log("delNode");
			const old_node = getState().nodes.find(node => node.id === payload.args)!;
			if(old_node === undefined) return true;
			const blank_node = { ...old_node, data: {...old_node.data, answers: [], questions: [], tags: []}};
			
			actions.beginRecordingGroup(payload.actionMode);
			let successes = await Promise.all(old_node.data.answers.map(
				async (ans) => await actions.deleteAnswer({graphId: payload.graphId, session: payload.session, args: {nodeId: ans.nodeId, answerId: ans.id}}))
			);
			let success = successes.reduce((b1, b2) => b1 && b2, true);
			successes = await Promise.all(old_node.data.questions.map(
				async (question) => await actions.deleteFAQQuestion({graphId: payload.graphId, session: payload.session, args: {nodeId: question.nodeId, faqId: question.id}})
			));
			success = success && successes.reduce((b1, b2) => b1 && b2, true);
			old_node.data.tags.forEach((tag) => actions.detachTag({graphId: payload.graphId, session: payload.session, args: {nodeId: old_node.id, tagId: tag}}));
			successes = await Promise.all(getState().connections.map(async (conn) => 
				(conn.source === old_node.id || conn.target === old_node.id)? 
					await actions.deleteConnection({graphId: payload.graphId, session: payload.session, args: {sourceNodeId: conn.source, sourceHandle: conn.sourceHandle!}})
				:
					true
			));
			success = success && successes.reduce((b1, b2) => b1 && b2, true);
			console.log("DEL SUCC NODE", success);
			success = success && await payload.session.call("dialogdesigner.node.delete", [], {graphId: payload.graphId, nodeId: payload.args}).then(() => {
				actions._deleteNode(old_node);
				actions.recordAction({fn: actions.deleteNode, inverseFn: actions.addNode, undoArgs: blank_node, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
			actions.endRecordingGroup(payload.actionMode); 
			return success;
		}
		return false;
	}),
	_deleteNode: action((state, payload) => {
		// push(state.undoStack, {fn: deleteNodeReversible, inverseFn: addNodeReversible, args: {node: state.nodes.find(node => node.id === payload)!, nodeId: payload, connections: state.connections.filter(conn => conn.source === payload || conn.target === payload)}});
		// if(payload.type === "userInputNode") {
		// 	const varName = payload.data.answers[0].text.split("=")[0].replace("{{", "").trim();
		// 	// decrease variable count
		// 	let varDef = state.variables.find(_var => _var.varName === varName);
		// 	if(varDef) {
		// 		varDef.count -= 1;
		// 		if(varDef.count === 0) {
		// 			state.variables = state.variables.filter(_var => _var.varName !== varName);
		// 		}
		// 	}
		// }

		state.nodes = state.nodes.filter(node => node.id !== payload.id);
	}),
	changeNodeMarkup: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			const old_markup = getState().nodes.find(node => node.id === payload.args.nodeId!)!.data.markup;
			return await payload.session.call("dialogdesigner.node.text.changed", [], {graphId: payload.graphId, raw: markupToRawText(payload.args.markup), ...payload.args}).then(() => {
				actions._changeNodeMarkup(payload.args);
				actions.recordAction({fn: actions.changeNodeMarkup, inverseFn: actions.changeNodeMarkup, undoArgs: {markup: old_markup, nodeId: payload.args.nodeId}, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
		}	
		return false;
	}),
	_changeNodeMarkup: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		node.data.raw_text = markupToRawText(payload.markup);
		node.data.markup = payload.markup;
	}),
	addAnswer: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			console.log("addAnswer");
			if(getState().nodes.find((node) => node.id === payload.args.nodeId)?.data.answers.find((ans) => ans.id === payload.args.id) !== undefined) return true;
			return await payload.session.call("dialogdesigner.answer.add", [], {graphId: payload.graphId, nodeId: payload.args.nodeId, answer: payload.args}).then(() => {
				actions._addAnswer(payload.args);
				actions.recordAction({fn: actions.addAnswer, inverseFn: actions.deleteAnswer, undoArgs: {nodeId: payload.args.nodeId, answerId: payload.args.id} as AnswerDeleteArgs, redoArgs: payload.args, actionMode: payload.actionMode})
				return true;
			}).catch(() => false);
		}	
		return false;
	}),
	_addAnswer: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		if(!node.data.answers.some((ans) => ans.id === payload.id)) node.data.answers.push(payload);
	}),
	deleteAnswer: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			console.log("delete answer");
			const old_answer = getState().nodes.find(node => node.id === payload.args.nodeId)!.data.answers.find(answer => answer.id === payload.args.answerId)!
			if(old_answer === undefined) return true;
			
			actions.beginRecordingGroup(UndoMode.Undo);
			const successes = await Promise.all(getState().connections.map(async (conn) => 
				(conn.source === payload.args.nodeId)?
					await actions.deleteConnection({graphId: payload.graphId, session: payload.session, args: {sourceNodeId: conn.source, sourceHandle: conn.sourceHandle!}})
				:
					true
			));
			let success = successes.reduce((b1, b2) => b1 && b2, true);
			console.log("DEL SUCC", success);

			success = success && await payload.session.call("dialogdesigner.answer.delete", [], {graphId: payload.graphId, ...payload.args}).then(() => {
				actions._deleteAnswer(payload.args);
				actions.recordAction({fn: actions.deleteAnswer, inverseFn: actions.addAnswer, undoArgs: old_answer, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
			actions.endRecordingGroup(UndoMode.Undo);
			return success;
		}
		return false;
	}),
	_deleteAnswer: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		node.data.answers = node.data.answers.filter(answer => answer.id !== payload.answerId!);
	}),
	addConnection: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			if(getState().connections.some((conn) => conn.source === payload.args.source && conn.sourceHandle === payload.args.sourceHandle && conn.target === payload.args.target)) return true;
			return await payload.session.call("dialogdesigner.node.connect", [], {graphId: payload.graphId, connection: payload.args}).then(() => {
				actions._addConnection(payload.args);
				actions.recordAction({fn: actions.addConnection, inverseFn: actions.deleteConnection, undoArgs: {sourceHandle: payload.args.source, sourceNodeId: payload.args.sourceHandle!} as ConnectionDeleteArgs, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			});
		}
		return false;
	}),
	_addConnection: action((state, payload) => {
		state.connections.push(payload);
	}),
	deleteConnection: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			const connection = getState().connections.find(conn => conn.source === payload.args.sourceNodeId && conn.sourceHandle === payload.args.sourceHandle)!;
			if(connection === undefined) return true;
			return await payload.session.call("dialogdesigner.node.disconnect", [], {graphId: payload.graphId, sourceNodeId: connection.source, sourceHandle: connection.sourceHandle}).then(() => {
				actions._deleteConnection(connection);
				actions.recordAction({fn: actions.deleteConnection, inverseFn: actions.addConnection, undoArgs: connection, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
		}
		return false;
	}),
	_deleteConnection: action((state, payload) => {
		state.connections = state.connections.filter(conn => conn.id !== payload.id!);
	}),
	changeAnswerText: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			const oldAnswerText = getState().nodes.find(node => node.id === payload.args.nodeId)!.data.answers.find(answer => answer.id === payload.args.answerId)!.text;
			return await payload.session.call("dialogdesigner.answer.text.changed", [], {graphId: payload.graphId, ...payload.args}).then(() => {
				actions._changeAnswerText(payload.args);
				actions.recordAction({fn: actions.changeAnswerText, inverseFn: actions.changeAnswerText, undoArgs: {nodeId: payload.args.nodeId, answerId: payload.args.answerId, text: oldAnswerText} as AnswerTextChangeArgs, redoArgs: payload.args, actionMode: payload.actionMode})
				return true;
			}).catch(() => false);
		}
		return false;
	}),
	_changeAnswerText: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		let answer = node.data.answers.find(answer => answer.id === payload.answerId!)!;
		answer.text = payload.text;
	}),
	updateAnswerList: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			let node = getState().nodes.find(node => node.id === payload.args.nodeId)!;
			const oldAnswers = node.data.answers;
			return await payload.session.call("dialogdesigner.answer.order.changed", [], {graphId: payload.graphId,  nodeId: payload.args.nodeId, answerIds: map(payload.args.answerList, ans => ans.id)}).then(() => {
				actions._updateAnswerList(payload.args);
				actions.recordAction({fn: actions.updateAnswerList, inverseFn: actions.updateAnswerList, undoArgs: {nodeId: node.id, answerList: oldAnswers} as AnswerListChangeArgs, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
		}	
		return false;
	}),
	_updateAnswerList: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		node.data.answers = payload.answerList;
	}),
	changeNodeType: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			const oldNodeType = getState().nodes.find(node => node.id === payload.args.nodeId)!.type;
			return await payload.session.call("dialogdesigner.node.type.changed", [], {graphId: payload.graphId, ...payload.args}).then(() => {
				actions._changeNodeType(payload.args);
				actions.recordAction({fn: actions.changeNodeType, inverseFn: actions.changeNodeType, undoArgs: {nodeId: payload.args.nodeId, nodeType: oldNodeType} as ChangeNodeTypeArgs, redoArgs: payload.args, actionMode: payload.actionMode});
			}).catch(() => false);
		}
		return false;
	}),
	_changeNodeType: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		node.type = payload.nodeType!;
	}),
	addFAQQuestion: thunk(async (actions, payload) => {
		if(payload.session) {
			return await payload.session.call("dialogdesigner.faq.add", [], {graphId: payload.graphId, faq: payload.args}).then(() => {
				actions._addFAQQuestion(payload.args);	
				actions.recordAction({fn: actions.addFAQQuestion, inverseFn: actions.deleteFAQQuestion, undoArgs: {nodeId: payload.args.nodeId, faqId: payload.args.id} as FAQQuestionDeleteArgs, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
		}
		return false
	}),
	_addFAQQuestion: action((state, payload) => {
		state.nodes.find(node => node.id === payload.nodeId!)!.data.questions.push(payload);
	}),
	deleteFAQQuestion: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			const oldFaqQuestion = getState().nodes.find(node => node.id === payload.args.nodeId)!.data.questions.find(faq => faq.id === payload.args.faqId)!;
			return await payload.session.call("dialogdesigner.faq.delete", [], {graphId: payload.graphId, ...payload.args}).then(() => {
				actions._deleteFAQQuestion(payload.args);
				actions.recordAction({fn: actions.deleteFAQQuestion, inverseFn: actions.addFAQQuestion, undoArgs: oldFaqQuestion, redoArgs: payload, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
		}
		return false;
	}),
	_deleteFAQQuestion: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		node.data.questions = node.data.questions.filter(q => q.id !== payload.faqId!);
	}),
	changeFAQQuestion: thunk(async (actions, payload, {getState}) => {
		if(payload.session) {
			const oldFaqQuestionText = getState().nodes.find(node => node.id === payload.args.nodeId)!.data.questions.find(q => q.id === payload.args.faqId)!.text;
			return await payload.session.call("dialogdesigner.faq.text.changed", [], {graphId: payload.graphId, ...payload.args}).then(() => {
				actions._changeFAQQuestion(payload.args);
				actions.recordAction({fn: actions.changeFAQQuestion, inverseFn: actions.changeFAQQuestion, undoArgs: {nodeId: payload.args.nodeId, faqId: payload.args.faqId, text: oldFaqQuestionText} as FAQQuestionChangeArgs, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
		}
		return false;
	}),
	_changeFAQQuestion: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId!)!;
		let question = node.data.questions.find(q => q.id === payload.faqId!)!;
		question.text = payload.text!;
	}),
	importNodes: action((state, payload) => {
		state.connections = [];
		state.nodes = payload.map((node) => {
			if(node.type === 'userInputNode') {
				const [varName, varType] = extractVariableNameAndTypeFromTemplate(node.data.answers[0].text);
				const _existingVar = state.variables.find(_var => _var.varName === varName);
				state.variables = state.variables.filter(_var => _var.varName !== varName);
				state.variables.push({varName: varName, varType: varType, count: _existingVar? _existingVar.count + 1 : 1});
			} else if(node.type === 'variableUpdateNode') {
				const parsedVar = parseFormulaFromText(node.data.raw_text);
				if(parsedVar.newVar) {
					const _existingVar = state.variables.find(_var => _var.varName === parsedVar.lhsVarName);
					state.variables = state.variables.filter(_var => _var.varName !== parsedVar.lhsVarName);
					state.variables.push({varName: parsedVar.lhsVarName!, varType: parsedVar.varType!, count: _existingVar? _existingVar.count + 1 : 1});
				}
			}

			if("tags" in node.data)
				return node;
			return  {
			 ...node,
			 data: {
				...(node.data as any),
				tags: []
			}
		 }
		});
		state.undoStack = [];
		state.redoStack = [];
	}),
	importConnections: action((state, payload) => {
		state.connections = payload.map((conn) => {
			return {
				...conn,
				// type: "smoothstep",
				type: 'customBezierEdge',
				arrowHeadType: ArrowHeadType.ArrowClosed
			}
		});
		state.undoStack = [];
		state.redoStack = [];

		state.startNode = state.nodes.find(node => node.type === "startNode");
	}),
	importTags: action((state, payload) => {
		state.tagList = payload;
		state.tagList.forEach(tag => {
			state.visibleTags.push(tag.id);
		});
		state.undoStack = [];
		state.redoStack = [];
	}),
	importDataTables: action((state, payload) => {
		state.dataTables = payload;
	}),
	resetVisibleTags: action((state, payload) => {
		state.visibleTags = !payload? state.tagList.map(tag => tag.id) : [];
		if( state.visibleTags.length > 0) {
			state.visibleTags.push("no Tag");
		}
		state.nodes.forEach((node) => (node as any).isHidden = payload);
		state.connections.forEach((conn) => conn.isHidden = payload);
	}),
	toggleTag: action((state, payload) => {
		if(state.visibleTags.includes(payload)) {
			state.visibleTags = state.visibleTags.filter(tagId => tagId !== payload);
		} else {
			state.visibleTags.push(payload);
		}

		let hiddenNodeIds = [] as string[];
		state.nodes.forEach((node) => {
			const isVisible = node.data.tags.length > 0? state.visibleTags.filter(tagId => node.data.tags.includes(tagId)).length > 0 : state.visibleTags.includes("no Tag");
			(node as any).isHidden = !isVisible;
			if(!isVisible) {
				hiddenNodeIds.push(node.id);
			}
		});
		state.connections.forEach((conn) => {
			conn.isHidden = hiddenNodeIds.includes(conn.source) || hiddenNodeIds.includes(conn.target);
		});
	}),	
	addNewTag: thunk(async (actions, payload, {getState}) => {
		if(getState().tagList.find((tag) => tag.id === payload.args.id)) return true; // tag already exists
		else if(payload.session) {
			// create new tag
			return await payload.session.call("dialogdesigner.tag.add", [], {graphId: payload.graphId, tagId: payload.args.id, color: payload.args.color}).then(() => {
				actions._addNewTag(payload.args);
				actions.recordAction({fn: actions.addNewTag, inverseFn: actions.deleteTag, undoArgs: payload.args.id, redoArgs: payload.args, actionMode: payload.actionMode});
				return true;
			}).catch(() => false);
		}
		return false;
	}),
	_addNewTag: action((state, payload) => {
		// push(state.undoStack, {fn: addNewTagReversible, inverseFn: deleteTagReversible, args: {tag: payload, tagId: payload.id}})
		state.tagList.push(payload);
		state.redoStack = [];
	}),
	deleteTag: thunk(async (actions, payload, {getState}) => {
		actions.beginRecordingGroup(payload.actionMode);
		// remove tag from nodes
		const taggedNodes = getState().nodes.filter(node => node.data.tags.includes(payload.args));
		const successes = await Promise.all(taggedNodes.map(
			async (node) => await actions.detachTag({graphId: payload.graphId, session: payload.session, args: {nodeId: node.id, tagId: payload.args}}))
		);
		let success = successes.reduce((b1, b2) => b1 && b2, true);
		
		// delete tag
		const oldTag = getState().tagList.find(tag => tag.id === payload.args);
		success = success && await payload.session.call("dialogdesigner.tag.delete", [], {graphId: payload.graphId, tagId: payload.args}).then(() => {
			actions._deleteTag(payload.args);
			actions.recordAction({fn: actions.deleteTag, inverseFn: actions.addNewTag, undoArgs: oldTag, redoArgs: payload.args});
			return true;
		}).catch(() => false);
		actions.endRecordingGroup(payload.actionMode); 
		return success;
	}),
	_deleteTag: action((state, payload) => {
		state.tagList = state.tagList.filter(tag => tag.id !== payload);
		state.redoStack = [];
	}),
	applyTag: thunk(async (actions, payload, {getState}) => {
		if(getState().nodes.find(node => node.id === payload.args.nodeId)?.data.tags.includes(payload.args.tagId)) return true;
		else if(payload.session) {
			return await payload.session.call("dialogdesigner.tag.apply", [], {graphId: payload.graphId, nodeId: payload.args.nodeId, tagId: payload.args.tagId}).then(() => {
				actions._applyTag(payload.args);
				actions.recordAction({fn: actions.applyTag, inverseFn: actions.detachTag, undoArgs: payload.args.tagId, redoArgs: payload.args});
				return true;
			}).catch(() => false);
		}
		return false;
	}),
	_applyTag: action((state, payload) => {
		// push(state.undoStack, {fn: applyTagReversible, inverseFn: detachTagReversible, args: {nodeId: payload.nodeId, tagId: payload.tagId}});
		applyTagReversible(state, {nodeId: payload.nodeId, tagId: payload.tagId});
		state.redoStack = [];
	}),
	detachTag: thunk(async (actions, payload, {getState}) => {
		if(!getState().nodes.find(node => node.id === payload.args.nodeId)?.data.tags.includes(payload.args.tagId)) return true;
		else if(payload.session) {
			return await payload.session.call("dialogdesigner.tag.detach", [], {graphId: payload.graphId, nodeId: payload.args.nodeId, tagId: payload.args.tagId}).then(() => {
				actions._detachTag(payload.args);
				actions.recordAction({fn: actions.detachTag, inverseFn: actions.applyTag, undoArgs: payload.args, redoArgs: payload.args});
				return true;
			}).catch(() => false);
		}
		return false;
	}),
	_detachTag: action((state, payload) => {
		let node = state.nodes.find(node => node.id === payload.nodeId);
		if(node) {
			node.data.tags = node.data.tags.filter(tag => tag !== payload.tagId);
		}
		state.redoStack = [];
	}),
	addVariable: action((state, payload) => {
		// push(state.undoStack, {fn: addVariableReversible, inverseFn: removeVariableReversible, args: {varName: payload.varName, varType: payload.varType}});
		addVariableReversible(state, {varName: payload.varName, varType: payload.varType});
		state.redoStack = [];
	}),
	updateVariable: action((state, payload) => {
		const oldVarDef = state.variables.find(_var => _var.varName === payload.oldVarName!)!;
		if(payload.varName === "VAR_NAME") {
			// delete var
			removeVariableReversible(state, {varName: payload.varName});
		} else {
			// update existing var
			oldVarDef.varName = payload.varName;
			oldVarDef.varType = payload.varType;
		}
		// push(state.undoStack, {fn: updateVariableReversible, inverseFn: revertVariableReversible, args: {varName: payload.varName, varType: payload.varType, oldVarName: payload.oldVarName, oldVarType: oldVarDef.varType}});
		state.redoStack = [];
	}),
	setDataTable: action((state, payload) => {
		state.dataTables = payload;
		console.log("TABLES UPLOADED");
	}),
	changeDataTableName: thunk(async (actions, payload) => {
		if(payload.session) {
			return await payload.session.call("dialogdesigner.datatable.name.changed", [], {graphId: payload.graphId, ...payload.args}).then(() => {
				actions._changeDataTableName(payload.args);
				return false;
			});
		}
	}),
	_changeDataTableName: action((state, payload) => {
		// push(state.undoStack, {fn: changeTableNameReversible, inverseFn: revertTableNameReversible, args: {oldMarkup: payload.oldName, newMarkup: payload.newName}});
		// changeTableNameReversible(state, {oldMarkup: payload.oldName, newMarkup: payload.newName});
		state.redoStack = [];
	}),
	deleteDataTable: action((state, payload) => {
		state.dataTables = state.dataTables.filter(table => table.name !== payload);
		if(state.session) {
			state.session.call("dialogdesigner.datatable.delete", [], {graphId: state.graphId, name: payload});
		}
	}), 
	restartDialog: thunk(async (actions, payload, {getState}) => {
		actions.resetChatHistory();
		const userId = payload;
		actions.setStartedOnce();
        if(getState().session && getState().session!.isOpen) {
            getState().session!.publish(`dialogsystem.start.${userId}`, [], {"user_id": userId});
            await new Promise (() => setTimeout(() => {
                console.log("publishing to gen user utterance");
                // sessionRef.current!.publish("gen_user_utterance", [], {gen_user_utterance: "", user_id: userId});
                getState().session!.publish(`graph_id.tree.${userId}`, [], {graph_id: getState().graphId, user_id: userId});
                getState().session!.publish(`user_acts.tree.${userId}`, [], {user_acts: [], user_id: userId});
                getState().session!.publish(`beliefstate.tree.${userId}`, [], {beliefstate: {}, user_id: userId});
            }, 100));
        }
	}),

	setStartedOnce: action((state, payload) => {
		state.startedOnce = true;
	}), 

	addToChatHistory: action((state, payload) => {
		state.chatHistory.push(payload);
	}),

	resetChatHistory: action((state) => {
		state.chatHistory = [];
	}),

	setShowDebugMenu: action((state) => {
		state.showDebugMenu = !state.showDebugMenu;
	}),

	setHideDebugMenu: action((state) => {
		state.hideDebugMenu = !state.hideDebugMenu;
	}),

	setSendEnabled: action((state, payload) => {
		state.sendEnabled = payload;
	})
}

export const store = createStore<StoreModel>(initialStore, {middleware: []});

const typedHooks = createTypedHooks<StoreModel>();

export const useStoreActions = typedHooks.useStoreActions;
export const useStoreDispatch = typedHooks.useStoreDispatch;
export const useStoreState = typedHooks.useStoreState;