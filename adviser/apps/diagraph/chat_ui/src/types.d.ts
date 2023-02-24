export interface IAnswer {
	nodeId: string,
	id: string,
	text: string,
}

export interface ILinkItem {
	nodeId: string,
	posX: number,
	posY: number,
	linkText: string
}

export interface IFAQQuestion {
	id: string,
	nodeId: string,
	text: string
}

export interface IVariable {
	varName: string,
	varType: string,
	count: number
}

export interface IVariableAddArgs {
	varName: string,
	varType: string
}

export interface IVariableUpdateArgs {
	oldVarName: string,
	varName: string,
	varType: string,
}

export interface INode {
	id: string,
	type: string,
	data: {
		markup: string,
		raw_text: string,
		answers: IAnswer[],
		questions: IFAQQuestion[],
		tags: string[],
		editMode: boolean,
	},
	position: {
		x: number,
		y: number
	},
	selected: boolean;
}

export interface ITag{
	id: string,
	color: string,
}


export interface NodeMarkupChangeArgs {
	nodeId: string,
	markup: string
}

export interface NodePositionChangArgs {
	nodeId: string;
	position: {x: number, y: number};
}

export interface AnswerTextChangeArgs {
	nodeId: string,
	answerId: string,
	text: string
}

export interface AnswerDeleteArgs {
	nodeId: string,
	answerId: string
}

export interface ChangeNodeTypeArgs {
	nodeId: string,
	nodeType: string
}

export interface TagsArgs {
	nodeId: string,
	tagId: string
}

export interface AnswerListChangeArgs {
	nodeId: string,
	answerList: IAnswer[]
}

export interface EditModeArgs {
	nodeId: string,
	editMode: boolean
}

export interface FAQQuestionChangeArgs {
	nodeId: string
	faqId: string,
	text: string
}

export interface FAQQuestionDeleteArgs {
	nodeId: string,
	faqId: string
}

export interface IDataTable {
	name: string,
	columns: string[];
}

export interface DataTableNameChangeArgs {
	oldName: string;
	newName: string;
}