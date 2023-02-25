from enum import Enum
import logging
from attr import dataclass
from typing import Dict, List, Tuple

from sentence_transformers import SentenceTransformer

from apps.diagraph.data.dialogGraph import Answer, DialogNode, DialogGraph, NodeType
from apps.diagraph.parsers.answerTemplateParser import AnswerTemplateParser
from apps.diagraph.parsers.logicParser import LogicTemplateParser
from apps.diagraph.parsers.systemTemplateParser import SystemTemplateParser
from services.service import ControlChannelMessages, PublishSubscribe, Service
from utils.memory import UserState
from utils.logger import DiasysLogger
from utils.useract import UserAct, UserActionType


class Intent(Enum):
    GUIDED = 0
    FREE = 1


class IntentTracker:
    def __init__(self, device: str = "cpu", ckpt_dir='./.models/intentpredictor') -> None:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        self.device = device
        self.tokenizer = AutoTokenizer.from_pretrained('deepset/gbert-large', use_fast=True, cache_dir=".models/gbert", truncation_side='left')
        self.model = AutoModelForSequenceClassification.from_pretrained(ckpt_dir, output_hidden_states = True).to(device)
        self.model.eval()
        self.free_counter = 0
        self.guided_counter = 0

    def get_intent(self, dialog_node: DialogNode, gen_user_utterance: str) -> Intent:
        tok = self.tokenizer(text=dialog_node.content, text_pair=gen_user_utterance, truncation=True, return_tensors="pt")
        tok = {key: tok[key].to(self.device) for key in tok}
        class_idx = self.model(**tok).logits.argmax(-1).item()
        return Intent(class_idx)
            

@dataclass
class FAQSearchResult:
    query: str
    similarity: float
    top_k: int
    goal_node_key: int


MAX_NODE_RECURSION_DEPTH = 100

# TODO: re-enable
# class FAQPolicy:
#     def __init__(self, tree: DialogDesigner, similarity_model: SentenceTransformer) -> None:
#         self.similarityModel = similarity_model
#         self.corpus_keys = []
#         self.corpus_texts = []
#         self.tree = tree

#         if os.path.isfile("corpus.pt"):
#             data = torch.load('corpus.pt')
#             self.copus_embedding = data['embedding']
#             self.corpus_keys = data['keys']
#         else:
#             node_ids = set()
#             for faq in Data.objects[version].faq_list():
#                 if not faq.dialog_node.key in node_ids:
#                     node_ids.add(faq.dialog_node.key)
#                     self.corpus_keys.append(faq.dialog_node.key)
#                     self.corpus_texts.append(faq.dialog_node.content.text)
#             self.copus_embedding = self.similarityModel.encode(self.corpus_texts, convert_to_tensor=True)
#             torch.save({"keys": self.corpus_keys, "embedding": self.copus_embedding}, "corpus.pt")

#     def top_k(self, query: str, k: int) -> List[FAQSearchResult]:
#         query_emb = self.similarityModel.encode(query, convert_to_tensor=True, show_progress_bar=False)
#         cos_scores = cos_sim(query_emb, self.copus_embedding)[0]
#         top_results = torch.topk(cos_scores, k=k)
            
#         results = []
#         counter = 0
#         for score, idx in zip(top_results[0], top_results[1]):
#             results.append(FAQSearchResult(deepcopy(query), similarity=score, top_k=counter, goal_node_key=self.corpus_keys[idx]))
#             counter += 1
        
#         assert len(results) == k
#         return results

class DialogTreePolicy(Service):
    def __init__(self, domain: str ='tree', logger: DiasysLogger = None, device: str = 'cpu', k: int = 1, identifier: str = "dialogTreePolicy", 
                    transports: str = "ws://localhost:8080/ws", realm="adviser") -> None:
        super().__init__(domain=domain, transports=transports, realm=realm, identifier=identifier)

        self.logger = logger
        self.templateParser = SystemTemplateParser()
        self.answerParser = AnswerTemplateParser()
        self.logicParser = LogicTemplateParser()
        self.device = device
        self.similarityModel = SentenceTransformer("distiluse-base-multilingual-cased-v2", device=self.device, cache_folder = '.models')
        # TODO: re-enable
        # self.intentPredictor = IntentTracker(device=self.device)
        # TODO: re-enable
        # self.faq_policy = FAQPolicy(tree=self.treeDesigner, similarity_model=self.similarityModel)
        self.k = k

        self.turn = UserState(lambda: 0)
        self.node_id = UserState(lambda: "-1")
        self.intent = UserState(lambda: None)

    def get_first_node(self, graph: DialogGraph) -> DialogNode:
        # find start node and then return its successor
        return graph.get_start_node().connected_node

    async def on_dialog_start(self, user_id: str):
        self.turn[user_id] = 0
        self.node_id[user_id] = "-1"
        logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: 0, turn: 0) - START")

    def fillTemplate(self, graph: DialogGraph, delexicalized_utterance: str, beliefstate: dict):
        try:
            return self.templateParser.parse_template(delexicalized_utterance, graph, beliefstate)
        except:
            return delexicalized_utterance

    def fillLogicTemplate(self, graph: DialogGraph, delexicalized_utterance: str, beliefstate: dict):
        try:
            return self.logicParser.parse_template(delexicalized_utterance, graph, beliefstate)
        except:
            return f"There was an error in the logic template: {delexicalized_utterance}"

    def get_possible_answers(self, node: DialogNode, beliefstate: dict):
        candidates = []
        for answer in node.answers.all():
            if "{{" in answer.text:
                var = self.answerParser.find_variable(answer.text)
                if var.name:
                    # if answer is template, fill in example values
                    example_bst = {}
                    # if var.name == "LAND" and var.name not in beliefstate:
                    #     for land in ["Deutschland", "USA", "England", "Frankreich", "Spanien", "Italien", "..."] :
                    #         candidates.append(land)
                    # elif var.name == "STADT" and var.name not in beliefstate and "LAND" in beliefstate:
                    #     # return all known cities for country in beliefstate
                    #     for stadt in [tagegeld.stadt for tagegeld in Tagegeld.objects.filter(land=beliefstate["LAND"]).all() if tagegeld.stadt != "$REST"]:
                    #         candidates.append(stadt.capitalize())
                    #     candidates.append("Andere Stadt")
                    if var.type == "BOOLEAN":
                        # return yes / no as answer option for boolean variable nodes
                        candidates += ['ja', 'nein']
            else:
                # no template, just output answer
                if ("[null]" not in answer.text) and ("Add a user response..." not in answer.text): # don't show skip node answers
                    candidates.append(answer.text)
        return candidates

    def _handle_logic_node(self, user_id: int, graph: DialogGraph, node: DialogNode, beliefstate: dict):
        # check if we are currently at a logic node
        if node.node_type == NodeType.LOGIC:
            # logic template in node! 
            # Form: "{{ lhs"
            #  -> incomplete, add each answer of form "operator rhs }}" to complete statement
            lhs = node.text	
            default_answer = None
            for answer in node.answers.all():
                # check if full statement {{{lhs rhs}}} evaluates to True
                rhs = answer.text
                if not "DEFAULT" in rhs: # handle DEFAULT case last!
                    if self.fillLogicTemplate(graph, f"{lhs} {rhs}", beliefstate):
                        # evaluates to True, follow this path!
                        next_node = answer.connected_node
                        self.node_id[user_id] = next_node.key
                        logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}) - LOGIC NODE CONDITION: {lhs} {rhs}")
                        return next_node, True
                else:
                    default_answer = answer
                    logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}) - LOGIC NODE CONDITION: DEFAULT")
            # default case
            self.node_id[user_id] = default_answer.connected_node.key
            return default_answer.connected_node, True
        return node, False

    def _handle_info_node(self, user_id: int, graph: DialogGraph, node: DialogNode, beliefstate: dict):
        """ Skip user input for nodes with answer [null] """
        # skip [null] anwsers to get to next system output immediately without user input
        sys_utterances = []
        if node.node_type == NodeType.INFO:
            sys_utterances.append((self.fillTemplate(graph, node.markup, beliefstate), node.get_node_type_display()))
            self.node_id[user_id] = None if isinstance(node.connected_node, type(None)) else node.key
            node = node.connected_node
            logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}) - INFO NODE: {sys_utterances[-1]}")
        return node, sys_utterances

    def _handle_var_node(self, user_id: int, graph: DialogGraph, node: DialogNode, beliefstate: dict):
        if node.node_type == NodeType.VARIABLE:
            # check if variable is already known
            answer = node.answers.first()
            expected_var = self.answerParser.find_variable(answer.text)
            if expected_var.name in beliefstate:
                # variable is alredy knonwn, skip to next node
                next_node = answer.connected_node
                self.node_id[user_id] = next_node.key
                logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}) - VAR NODE - ALREADY KNOWN: VAR {expected_var}")
                return next_node, [], True
            else:
                # variable is not known, ask
                self.node_id[user_id] = node.key
                logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}) - VAR NODE - NOT KNOWN: VAR {expected_var}")
                return node, [(self.fillTemplate(graph, node.markup, beliefstate), node.get_node_type_display())], True 
        return node, [], False

    def _math_op(self, lhs: str, op: str, rhs: str):
        if op == "+":
            return float(lhs) + float(rhs)
        elif op == "-":
            return float(lhs) - float(rhs)
        elif op == "*":
            return float(lhs) * float(rhs)
        elif op == "/":
            if float(rhs) == 0:
                return 0
            return float(lhs) / float(rhs)

    def _handle_varUpdate_node(self, user_id: int, graph: DialogGraph, node: DialogNode, beliefstate: dict):
        sys_utterances = []
        if node.node_type == NodeType.UPDATE:
            # parse content
            atoms = node.text.split(" ")
            var_name = None
            var_type = None
            op = None
            rhs1 = None
            rhs2 = None 
            for i, atom in enumerate(atoms):
                if i == 0:
                    res = atom.split("(")
                    var_name = res[0]
                    if len(res) > 1:
                        # we have a new variable definition
                        var_type = res[1].replace(")", "")
                elif i == 1:
                    pass # either = or := 
                elif i == 2:
                    rhs1 = atom
                elif i == 3:
                    op = atom
                elif i == 4:
                    rhs2 = atom

            if isinstance(rhs1, type(None)):
                sys_utterances.append((f"The variable '{var_name}' could not be updated, as there was no right hand side specified", "errorMsg"))
                return node, sys_utterances, True
            result = beliefstate[rhs1] if rhs1 in beliefstate else rhs1.strip()
            other = beliefstate[rhs2] if rhs2 in beliefstate else rhs2
            if not isinstance(other, type(None)):
                other = other.strip()

            print("!!!", result, op, other)

            # rhs1 is a value, not a variable - try to cast
            if result.lower() in ['true', 'false']:
                result = result.lower() == "true"
            else:
                try:
                    result = float(result)
                except:
                    sys_utterances.append((f"The variable '{var_name}' could not be updated, as the variable/value '{rhs1}' was invalid or not in the chat history", "errorMsg"))
                    return node, sys_utterances, True
    
            if op and op in ["+", "-", "*", "/"]:
                if not isinstance(rhs2, type(None)):
                    # type must be number
                    # we expect a rhs2!
                    try:
                        other = float(other)
                        result = self._math_op(result, op, other)
                    except:
                        sys_utterances.append((f"The variable '{var_name}' could not be updated, as the variable/value '{rhs2}' was invalid or not in the chat history", "errorMsg"))
                        return node, sys_utterances, True
            elif op and op in ["AND", "OR", "NEGATE"]:
                # type must be a boolean
                if op == "NEGATE":
                    # no rhs 2
                    result = not bool(result)
                elif not isinstance(other, type(None)):
                    # we expect a rhs2!
                    if other.lower() in ['true', 'false']:
                        other = other.lower() == "true"
                        if op == "AND":
                            result = result and other
                        else:
                            result = result or other
                    else:
                        sys_utterances.append((f"The variable '{var_name}' could not be updated, as the variable/value '{rhs2}' was invalid or not in the chat history", "errorMsg"))
                        return node, sys_utterances, True

            beliefstate[var_name] = result
            print(" - bst update", var_name, ":",result)
            self.node_id[user_id] = None if isinstance(node.connected_node, type(None)) else node.key
            node = node.connected_node
            return node, sys_utterances, True
        return node, sys_utterances, False


                

    @PublishSubscribe(sub_topics=['user_acts', 'beliefstate', "graph_id"], pub_topics=["sys_utterances", "node_id", 'answer_candidates', 'user_acts', 'beliefstate', 'tree_end_reached', 'node_pos', ControlChannelMessages.DIALOG_END], user_id=True)
    def choose_sys_act(self, user_acts: List[UserAct], beliefstate: dict, user_id: int, graph_id: str) -> dict(sys_utterances=str, node_id=int, answer_candidates=list, user_acts=list,beliefstate=dict, node_pos=dict):
        turn_count = self.turn[user_id]

        # get context for current user and selected conversation graph
        graph: DialogGraph = DialogGraph.objects.get(uuid=graph_id)

        if turn_count == 0:
            # greeting message: find dialog entry node
            print("FIRST TURN")
            first_node = self.get_first_node(graph)
            if not first_node:
                return {"tree_end_reached": True }
            self.node_id[user_id] = first_node.key

        sys_utterances = []
        node: DialogNode = graph.nodes.get(key=self.node_id[user_id])
        logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}, turn: {turn_count})")

        # check if we have unrecognized user inputs
        for act_dict in user_acts:
            act = UserAct.from_json(act_dict)
            if act.type == UserActionType.UnrecognizedValue:
                logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}, turn: {turn_count}) - UNRECOGNIZED VALUE: VAR {act.slot} - VALUE {act.value}")
                sys_utterances.append((f"Sorry, I didn't recognize {act.value} as {act.slot}. Please rephrase your input!", "errorMsg"))
            if act.type == UserActionType.TooManyValues:
                logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}, turn: {turn_count}) - TOO MANY VALUES: VAR{act.slot} - VALUE {act.value}")
                sys_utterances.append((f"I recognized multiple values for the variable {act.slot}: {act.value}. Please enter only one value at a time!", "errorMsg"))
            if len(sys_utterances) > 0:
                # tell users we don't recognize their inputs, stay at same node.
                logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}, turn: {turn_count}) - SYS UTTERANCE: {sys_utterances}")
                return {
                    "sys_utterances": sys_utterances,
                    "node_id": node.key,
                    "answer_candidates": self.get_possible_answers(node, beliefstate),
                    "node_pos": {"x": node.position_x, "y": node.position_y},
                    "beliefstate": beliefstate,
                    "tree_end_reached": False,
                }

        # Handle User acts
        # dialog is already running and we don't have to handle a logic node, select next answer depending on user acts 
        # (TODO later: depending on beliefstate as well)
        for act_dict in user_acts:
            act = UserAct.from_json(act_dict)
            selected_answer: Answer = None
            for answer in node.answers.all():
                if answer.text == act.text:
                    selected_answer = answer
                    break
            node = selected_answer.connected_node
            self.node_id[user_id] = node.key
        
        output = self.handle_node(user_id=user_id, graph=graph, node=node, user_acts=user_acts, beliefstate=beliefstate, sys_utterances=sys_utterances, tree_end_reached=False, call_num=0)
        self.node_id[user_id] = output['node_id']
        
        print("FINAL OUTPUT", output['beliefstate'])
        print(" - ", beliefstate)
        return output

    def handle_node(self, user_id: str, graph: DialogGraph, node: DialogNode, user_acts: List[UserAct], beliefstate: Dict, sys_utterances: List[Tuple], tree_end_reached: bool, call_num: int):
        # Handle Logic nodes
        print("START HANDLE NODE - BST ", call_num, beliefstate)
        x_pos = node.position_x
        y_pos = node.position_y
        if call_num >= MAX_NODE_RECURSION_DEPTH:
            sys_utterances.append((f"Traversing more than {MAX_NODE_RECURSION_DEPTH} nodes without user input in between is not currently supported (also verify that your graph doesn't contain infinite loops)!", "errorMsg"))
            return {
                "sys_utterances": sys_utterances,
                "node_id": None,
                "answer_candidates": [],
                'user_acts': [],
                'beliefstate': beliefstate,
                "tree_end_reached": True,
                "node_pos": {"x": x_pos, "y": y_pos}
            }

        turn_count = self.turn[user_id]
        logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}, turn: {turn_count}) - HANDLE NODE: TREE END REACHED {tree_end_reached}")
        node, isLogicTemplate = self._handle_logic_node(user_id=user_id, graph=graph, node=node, beliefstate=beliefstate)
        if isLogicTemplate:
            self.turn[user_id] = turn_count + 1
            if node:
                return self.handle_node(user_id, graph, node, [], beliefstate, sys_utterances, False, call_num+1)
            elif sys_utterances:
                # if self.logger:
                    # self.logger.dialog_turn(f"POLICY {user_id}: TURN {turn_count}, node: {node.key if node else 'None'}, TYPE: {node.node_type}, TEXT: {node.text}")
                return {
                    "sys_utterances": sys_utterances,
                    "node_id": node.key,
                    "answer_candidates": [],
                    'user_acts': [],
                    'beliefstate': beliefstate,
                    "node_pos": {"x": node.position_x, "y": node.position_y}
                }
            else:
                return {
                    'user_acts': [],
                    'beliefstate': beliefstate,
                    "node_id": node.key,
                    "node_pos": {"x": node.position_x, "y": node.position_y}
                }

        node, isInfoNode = self._handle_info_node(user_id=user_id, graph=graph, node=node, beliefstate=beliefstate)
        if isInfoNode:
            self.turn[user_id] = turn_count + 1
            sys_utterances += isInfoNode
            # if self.logger:
                # self.logger.dialog_turn(f"POLICY {user_id}: TURN {turn_count}, NODE: {node}, TYPE: infoNode, TEXT: {sys_utterances}")
            if not node: 
                # no follow-up node
                return {
                    "sys_utterances": sys_utterances,
                    "node_id": None,
                    "answer_candidates": [],
                    "tree_end_reached": True,
                    'beliefstate': beliefstate,
                    "node_pos": {"x": x_pos, "y": y_pos}
                }
            return self.handle_node(user_id, graph, node, [], beliefstate, sys_utterances, False, call_num+1)
            # return {
            #     "sys_utterances": sys_utterances,
            #     "node_id": node,
            #     "answer_candidates": [],
            #     'user_acts': [],
            #     'beliefstate': beliefstate
            # }

        node, varUtterances, isVarNode = self._handle_var_node(user_id=user_id, graph=graph, node=node, beliefstate=beliefstate)
        if isVarNode:
            self.turn[user_id] = turn_count + 1
            sys_utterances += varUtterances
            if len(varUtterances) > 0:
                # value unkown, don't skip user input
                # if self.logger:
                #     self.logger.dialog_turn(f"POLICY {user_id}: TURN {turn_count}, node: {node.key if node else 'None'}, TYPE: {node.node_type}, TEXT: {sys_utterances}")
                return {
                    "sys_utterances": sys_utterances,
                    "node_id": node.key,
                    "answer_candidates": self.get_possible_answers(node, beliefstate),
                    'beliefstate': beliefstate,
                    "node_pos": {"x": node.position_x, "y": node.position_y}
                }
            else:
                # value alredy known skip user input
                if self.logger:
                    self.logger.dialog_turn(f"POLICY {user_id}: TURN {turn_count}, NODE: {node}, TYPE: varNode, TEXT: {sys_utterances}")
                return {
                    "sys_utterances": sys_utterances,
                    "node_id": node.key,
                    "answer_candidates": [],
                    'user_acts': [],
                    'beliefstate': beliefstate,
                    "node_pos": {"x": node.position_x, "y": node.position_y}                   
                }

        node, updateUtterances, isUpdateNode = self._handle_varUpdate_node(user_id=user_id, graph=graph, node=node, beliefstate=beliefstate)
        if isUpdateNode:
            print("UPDATE NODE")
            self.turn[user_id] = turn_count + 1
            sys_utterances += updateUtterances

            if not node:
                return {
                    "sys_utterances": sys_utterances,
                    "node_id": None,
                    "answer_candidates": [],
                    "tree_end_reached": True,
                    "beliefstate": beliefstate,
                    "node_pos": {"x": x_pos, "y": y_pos}
                }
            else:
                # skip user input
                # if self.logger:
                # self.logger.dialog_turn(f"POLICY {user_id}: TURN {turn_count}, NODE: {node}, TYPE: varNode, TEXT: {sys_utterances}")
                print("HANDLE NODE BST", beliefstate)
                return self.handle_node(user_id, graph, node, [], beliefstate, sys_utterances, False, call_num+1)



        # normal template, fill with values from beliefstate
        # sys_utterances.append(self.fillTemplate(node.content.markup, beliefstate))
        # if self.logger:
        # 	self.logger.dialog_turn(f'Policy: user selected answer {selected_answer.content.text}')
        # 	self.logger.dialog_turn(f'Policy: transitioning to next node {node.key}')

        # Handle self-calls
        self.turn[user_id] = turn_count + 1
        # if not isinstance(node, DialogNode):
        #     node = self.treeDesigner.tree._node_by_key[node]
        sys_utterances += [(self.fillTemplate(graph, node.markup, beliefstate), node.get_node_type_display())]

        if isinstance(node.connected_node, type(None)) and all([isinstance(ans.connected_node, type(None)) for ans in node.answers.all()]):
            tree_end_reached = True

        logging.getLogger('chat').info(f"POLICY (user: {user_id}, node: {node.key if node else 'None'}, turn: {turn_count}) - HANDLE NODE: SYS UTTERANCE: {sys_utterances}")    
        # if self.logger:
        #     self.logger.dialog_turn(f"POLICY {user_id}: TURN {turn_count}, node: {node.key if node else 'None'}, TYPE: {node.node_type}, TEXT: {sys_utterances}")
        # for sysutt in sys_utterances:
        # 	if "vielen dank" in sysutt[0].lower():
        # 		return {
        # 			f'{Topic.DIALOG_END}': True
        # 		}
        return {
            "sys_utterances": sys_utterances,
            "node_id": node.key,
            "answer_candidates": self.get_possible_answers(node, beliefstate),
            "tree_end_reached": tree_end_reached,
            "beliefstate": beliefstate,
            "node_pos": {"x": node.position_x, "y": node.position_y}
        }