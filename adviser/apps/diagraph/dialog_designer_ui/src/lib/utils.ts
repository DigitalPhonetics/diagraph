export const createUniqueId = () => {
	const milliseconds = new Date().getTime().toString();
	let random = Math.random().toString();
	random = random.substring(random.length-4);
	return milliseconds + random;
};

export const htmlDecode = (input: string) => {
	return input.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "").replace(/&nbsp;/g, '').replace(/&auml;/g, 'ä').replace(/&Auml;/g, 'Ä').replace(/&uuml;/g, 'ü').replace(/&Uuml;/g, 'Ü').replace(/&ouml;/g, 'ö').replace(/&Ouml;/g, 'Ö').replace(/&szlig;/g, 'ß').replace(/&euro;/g, "€").replace(/&bdquo;/g, '"').replace(/&ldquo;/g, '"').replace(/&sbquo;/g, "'").replace(/&lsquo;/g, "'");
}

export const extractVariableNameAndTypeFromTemplate = (template: string) => {
	const [varName, varType] = template.replace("{{", "").replace("}}", "").split("=");
	return [varName.trim(), varType.trim()];
}

export function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export type Operation = "+" | "-" | "*" | "/" | "AND" | "OR" | "NEGATED";

export interface EquationProps {
	lhsVarName?: string;
	op?: Operation;
	rhs1?: string;
	rhs2?: string;
	newVar?: boolean;
	varType?: string;
}

// FORM: lhs = rhs1 op rhs2
export const parseFormulaFromText = (text: string) => {
	let result = {} as EquationProps;
	if(text === "VAR_NAME") {
		return result; // empty equation
	}
	const eqParts = text.split(" ");
	for(let i = 0; i < eqParts.length; i++) {
		if(i == 0) {
			const lhsParts = eqParts[i].split("(");
			result.lhsVarName = lhsParts[0];
			if(lhsParts.length > 1) result.varType = lhsParts[1].replace(")", "");
		} 
		if(i == 1) { // expect equality sign here
			if(eqParts[i] !== "=" && eqParts[i] !== ":=") return result; 
			result.newVar = eqParts[i] === ":=";
		} 
		else if(i == 2) result.rhs1 = eqParts[i];
		else if(i == 3) result.op = eqParts[i] as Operation;
		else if(i == 4) result.rhs2 = eqParts[i];
	}
	return result;
}
