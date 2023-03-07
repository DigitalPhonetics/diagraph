import logging
from typing import List, Tuple, Union

import torch
from torch.nn.functional import cosine_similarity
from apps.diagraph.data.dialogGraph import DialogGraph, DialogNode, NodeType, ConversationLogEntry

from services.service import Service, PublishSubscribe
from apps.diagraph.parsers.answerTemplateParser import AnswerTemplateParser
from apps.diagraph.nlu import NLU
from utils.logger import DiasysLogger
from utils.memory import UserState
from utils.useract import UserAct, UserActionType


# TODO clear after DB change
class SentenceEmbeddings():
    SIMILARITY_THRESHOLD = 0.01 # TODO find acceptable threshold

    def __init__(self, device: str, pretrained_name: str = 'distiluse-base-multilingual-cased', embedding_dim: int = 512) -> None:
        from sentence_transformers import SentenceTransformer
        self.device = device
        self.embedding_dim = embedding_dim        
        self.pretrained_name = pretrained_name
        self.bert_sentence_embedder = SentenceTransformer(pretrained_name, device=device, cache_folder = '.models')

    @torch.no_grad()
    def encode(self, text: Union[str, None]) -> torch.FloatTensor:
        """
        Returns:
            (1, 512)
        """
        if text:
            return self.bert_sentence_embedder.encode(text, convert_to_numpy=False, convert_to_tensor=True, show_progress_bar=False).unsqueeze(0)
        else:
            return torch.zeros(1, 1, self.embedding_dim, dtype=torch.float, device=self.device)

    @torch.no_grad()
    def embed_node_answers(self, node: DialogNode) -> torch.FloatTensor:
        """
        Returns:
            (#answers, 512)
        """
        return torch.cat([self.encode(answer.text) for answer in node.answers.all().order_by('index')], dim=0)
        


class SimilarityMatchingNLU(Service):
    SIMILARITY_THRESHOLD = 0.01 # TODO find acceptable threshold

    def __init__(self, embeddings: SentenceEmbeddings, domain='reisekosten', logger: DiasysLogger = None, identifier: str = "similarityMatchingNLU", 
                    transports: str = "ws://localhost:8080/ws", realm="adviser") -> None:
        super().__init__(domain=domain, identifier=identifier, realm=realm, transports=transports)
        self.embeddings = embeddings
        self.logger = logger
        self.templateParser = AnswerTemplateParser()
        self.nlu = NLU()

        self.beliefstate = UserState(lambda: dict())
        self.turn = UserState(lambda: 0)

    def match_help(self, utterance: str) -> bool:
        if 'help' in utterance:
            return True
        return False

    async def on_dialog_start(self, user_id: str):
        self.beliefstate[user_id] = {}
        self.turn[user_id] = 0
        logging.getLogger('chat').info(f"NLU (user: {user_id}, node: 0, turn: 0) - START")

    def _extract_location(self, user_id: int, user_utterance: str, beliefstate: dict):
        acts = []
        # locations = self.nlu.extract_places(user_utterance)
        # Check that user did not mention more than one location in this turn.
        # If slot is empty, remove it (makes checking slot validity easier later)
        # locations = {slot: locations[slot] for slot in locations if len(locations[slot]) > 0}
        # for slot in locations:
        #     if len(locations[slot]) > 1:
        #         acts.append(UserAct(act_type=UserActionType.TooManyValues, slot=slot, value=f'"{", ".join(locations[slot])}"'))
        # # Check that mentioned locations are valid. If so, add to beliefstate
        # for slot in locations: 
        #     location_value = locations[slot][0]
        #     # TODO make slot handling generic
        #     if slot == "LAND":
        #         # check that country is known to our database
        #         raise NotImplementedError
        #         if Tagegeld.objects.filter(land__iexact=location_value).exists():
        #             beliefstate[slot] = Tagegeld.objects.filter(land__iexact=location_value).first().land
        #             self.set_state(user_id, "beliefstate", beliefstate)
        #         else:
        #             acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=slot, value=location_value))
        #     elif slot == "STADT":
        #         raise NotImplementedError
        #         # check that the city is (hopefully) not an emty expression
        #         if len(location_value) >= 2:
        #             if Tagegeld.objects.filter(stadt__iexact=location_value).exists():
        #                 beliefstate[slot] = location_value
        #                 self.set_state(user_id, "beliefstate", beliefstate)
        #             else:
        #                 beliefstate[slot] = "$REST" # city unkown -> no special rules
        #                 self.set_state(user_id, "beliefstate", beliefstate)
        #         else:
        #             acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=slot, value=location_value))
        return acts

    def _extract_time(self, user_id: int, user_utterance: str, beliefstate: dict):
        times = self.nlu.extract_time(user_utterance)
        return []
        # TODO handle times in BST

    def _fill_variable(self, user_id: int, answer_template: str, user_utterance: str, beliefstate: dict, node: DialogNode):
        acts = []
        expected_var = self.templateParser.find_variable(answer_template)
        # print(" - requested filling variable", expected_var.name, expected_var.type)
        if expected_var.name and expected_var.type:
            if len(user_utterance.strip()) == 0:
                acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=expected_var.name, value=""))
                return acts
            if expected_var.type == "TEXT":
                # if len(user_utterance.split()) > 1:
                # acts.append(UserAct(act_type=UserActionType.TooManyValues, slot=expected_var.name, value=f'"{", ".join(user_utterance.split())}"'))
                # else:
                #     # set variable
                beliefstate[expected_var.name] = user_utterance
            elif expected_var.type == "NUMBER":
                if len(user_utterance.split()) > 1:
                    acts.append(UserAct(act_type=UserActionType.TooManyValues, slot=expected_var.name, value=f'"{", ".join(user_utterance.split())}"'))
                else:
                    try:
                        # set variable
                        beliefstate[expected_var.name] = float(user_utterance.strip())
                    except:
                        acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=expected_var.name, value=user_utterance.strip()))
            elif expected_var.type == "BOOLEAN":
                utterance_emb = self.embeddings.encode(user_utterance) # 1 x 512
                answers = ["yes", "no"]
                answer_embs = torch.cat([self.embeddings.encode(answer) for answer in answers], axis=0) # 2 x 512
                similarities = cosine_similarity(utterance_emb, answer_embs, -1)
                most_similar_answer_idx = similarities.argmax(-1).item()
                max_similarity_score = similarities[most_similar_answer_idx] # top answer score
                if max_similarity_score >= self.SIMILARITY_THRESHOLD:
                    beliefstate[expected_var.name] = True if most_similar_answer_idx == 0 else False
                else:
                    acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=expected_var.name, value=user_utterance.strip()))
            elif expected_var.type == "TIMEPOINT":
                times = self.nlu.extract_time(user_utterance)
                if times:
                    times = times['time_points']
                if len(times) == 0:
                    acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=expected_var.name, value=user_utterance.strip()))
                else:
                    beliefstate[expected_var.name] = times
                    # TODO extract only one type of time from dict
            elif expected_var.type == "TIMESPAN":
                times = self.nlu.extract_time(user_utterance)
                if times:
                    times = times['time_spans']
                if len(times) == 0:
                    acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=expected_var.name, value=user_utterance.strip()))
                else:
                    beliefstate[expected_var.name] = times[-1]
                    # TODO extract only one type of time from dict
            # elif expected_var.type == "LOCATION":
            #     locations = self.nlu.extract_places(user_utterance)
            #     # Check that user did not mention more than one location in this turn.
            #     # If slot is empty, remove it (makes checking slot validity easier later)
            #     locations = {slot: locations[slot] for slot in locations if len(locations[slot]) > 0}
            #     for slot in locations:
            #         if len(locations[slot]) > 1:
            #             acts.append(UserAct(act_type=UserActionType.TooManyValues, slot=slot, value=f'"{", ".join(locations[slot])}"'))
            #     # Check that mentioned locations are valid. If so, add to beliefstate
            #     if expected_var.name == "LAND" and not locations:
            #         # only check for invalid countries; for cities, we don't have an exhaustive list
            #         acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=expected_var.name, value=user_utterance))
            #     for slot in locations:
            #         location_value = locations[slot][0]
            #         # TODO make slot handling generic
            #         if slot == "LAND":
            #             raise NotImplementedError
            #             # check that country is known to our database
            #             # if Tagegeld.objects.filter(land__iexact=location_value).exists():
            #             #     beliefstate[expected_var.name] = Tagegeld.objects.filter(land__iexact=location_value).first().land
            #             #     self.set_state(user_id, "beliefstate", beliefstate)
            #             # else:
            #             #     acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=slot, value=location_value))
            #         elif slot == "STADT":
            #             raise NotImplementedError
            #             # check that the city is (hopefully) not an emty expression
            #             # if Tagegeld.objects.filter(stadt__iexact=location_value).exists():
            #             #     beliefstate[expected_var.name] = location_value
            #             #     self.set_state(user_id, "beliefstate", beliefstate)
            #             # else:
            #             #     beliefstate[expected_var.name] = "$REST" # city unkown -> no special rules
            #             #     self.set_state(user_id, "beliefstate", beliefstate)
            #     if expected_var.name == "STADT" and "STADT" not in locations:
            #         # City that we don't know from table
            #         location_value = user_utterance.strip()
            #         if len(location_value) >= 2:
            #             beliefstate[expected_var.name] = "$REST" # city unkown -> no special rules
            #             self.set_state(user_id, "beliefstate", beliefstate)
            #         else:
            #             acts.append(UserAct(act_type=UserActionType.UnrecognizedValue, slot=slot, value=location_value))

        return acts
        
    def log_to_database(self, graph: DialogGraph, user_id: int, usr_utterance: str):
        ConversationLogEntry(graph=graph, user=user_id, module="INPUT", content=usr_utterance).save()

    @PublishSubscribe(sub_topics=["user_utterance", "node_id", "graph_id", "beliefstate"], pub_topics=["user_acts", "beliefstate"], user_id=True)
    def extract_user_acts(self, user_id: int, graph_id: str, user_utterance: str, node_id: int, beliefstate: dict) -> dict(user_acts=List[UserAct]):
        logging.getLogger('chat').info(f"NLU (user: {user_id}, node: {node_id}) - input: {user_utterance}")

        graph: DialogGraph = DialogGraph.objects.get(uuid=graph_id)
        self.log_to_database(graph, user_id, user_utterance)

        acts = []
        beliefstate = self.beliefstate[user_id] | beliefstate
        current_node = graph.nodes.get(key=node_id)
        turn = self.turn[user_id]
        self.turn[user_id] = turn + 1

        if turn == 0:
            # handle first turn: check if user mentioned city or country directly
            acts += self._extract_location(user_id, user_utterance, beliefstate)
            acts += self._extract_time(user_id, user_utterance, beliefstate)
        logging.getLogger('chat').info(f"NLU (user: {user_id}, node: {node_id}, turn: {turn}) - GENERAL ACTS: {acts}")

        # check if this turn should fill a variable for BST
        if current_node.node_type == NodeType.VARIABLE:
            acts += self._fill_variable(user_id, current_node.answers.first().text, user_utterance, beliefstate, current_node)
            logging.getLogger('chat').info(f"NLU (user: {user_id}, node: {node_id}, turn: {turn}) - VAR ACTS: {user_utterance}")

        logging.getLogger('chat').info(f"NLU (user: {user_id}, node: {node_id}, turn: {turn}) - BST: {beliefstate}")
        if len(acts) > 0:
            logging.getLogger('chat').info(f"NLU (user: {user_id}, node: {node_id}, turn: {turn}) - ACTS: {acts}")
            self.beliefstate[user_id] = beliefstate
            return {
                'user_acts': acts,
                'beliefstate': beliefstate,
            }
        
        # match user utterance against possible answers
        utterance_emb = self.embeddings.encode(user_utterance).squeeze(0) #  1 x 512 -> 512
        answer_embs = self.embeddings.embed_node_answers(current_node) # answers x 512
        similarities = cosine_similarity(utterance_emb, answer_embs, -1)
        most_similar_answer_idx = similarities.argmax(-1).item()
        max_similarity_score = similarities[most_similar_answer_idx] # top answer score

        if max_similarity_score >= self.SIMILARITY_THRESHOLD:
            # found acceptable answer, return top answer
            acts.append(UserAct(text=current_node.answers.get(index=most_similar_answer_idx).text, act_type=UserActionType.NormalUtterance))
            logging.getLogger('chat').info(f"NLU (user: {user_id}, node: {node_id}, turn: {turn}) - MATCHED ANSWER: {current_node.answers.get(index=most_similar_answer_idx).text} - SCORE: {max_similarity_score}")
        logging.getLogger('chat').info(f"NLU (user: {user_id}, node: {node_id}, turn: {turn}) - ACTS: {acts}")

        self.beliefstate[user_id] = beliefstate
        return {
            'user_acts': acts,
            'beliefstate':beliefstate
        }