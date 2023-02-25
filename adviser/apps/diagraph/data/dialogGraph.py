from io import StringIO
import random
import time
from typing import Any, Dict, List, Union
import warnings
import pandas
from io import StringIO
import uuid

from apps.diagraph.utils import html_to_raw_text
from django.utils.translation import gettext_lazy as _

from django.db import models, transaction
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class NodeType(models.TextChoices):
    INFO = "INFO", _("infoNode")
    VARIABLE = "VARIABLE", _("userInputNode")
    UPDATE = "UPDATE", _("variableUpdateNode")
    QUESTION = "RESPONSE", _("userResponseNode")
    LOGIC = "LOGIC", _("logicNode")
    START = "START", _("startNode")
    
    @classmethod
    def from_real_value(cls, real_value: str):
        if real_value == "infoNode":
            return cls.INFO
        elif real_value == "userInputNode":
            return cls.VARIABLE
        elif real_value == "userResponseNode":
            return cls.QUESTION
        elif real_value == "logicNode":
            return cls.LOGIC
        elif real_value == "variableUpdateNode":
            return cls.UPDATE
        elif real_value == "startNode":
            return cls.START
        raise ValueError(real_value)
    
    class Meta:
        app_label = "data"


class DataTable(models.Model):
    graph = models.ForeignKey("DialogGraph", on_delete=models.CASCADE, related_name="tables")
    name = models.TextField()
    content = models.TextField() # csv file

    class Meta:
        app_label = 'data'


class DataTableColumn(models.Model):
    table = models.ForeignKey(DataTable, on_delete=models.CASCADE, related_name="columns")
    label = models.TextField()

    class Meta:
        app_label = 'data'


class Tag(models.Model):
    key = models.TextField()
    color = models.TextField()
    graph = models.ForeignKey("DialogGraph", on_delete=models.CASCADE, related_name="tags")

    class Meta:
        app_label = "data"
        # constraints = [
        #     models.UniqueConstraint(
        #         fields=['graph', 'key'], name='unique_graph_tag_combination'
        #     )
        # ]

class DialogNode(models.Model):
    key = models.BigIntegerField()
    graph = models.ForeignKey("DialogGraph", on_delete=models.CASCADE, related_name="nodes")
    node_type = models.CharField(
        max_length=40,
        choices=NodeType.choices,
        default=NodeType.QUESTION,
    )
    connected_node = models.ForeignKey("self", null=True, on_delete=models.SET_NULL, default=None, related_name="incoming_nodes")
    tags = models.ManyToManyField(Tag, related_name="nodes")

    text = models.TextField()
    markup = models.TextField()
    position_x = models.FloatField(default=0.0)
    position_y = models.FloatField(default=0.0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['graph', 'key'], name='unique_graph_node_combination'
            )
        ]
        app_label = "data"

    def answer_by_index(self, index):
        return self.answers.get(index=index) 

    def answer_by_goalnode_key(self, goalnode_key: int):
        return self.answers.get(connected_node__key=goalnode_key)


class Answer(models.Model):
    key = models.BigIntegerField()
    node = models.ForeignKey(DialogNode, on_delete=models.CASCADE, related_name="answers")
    connected_node = models.ForeignKey(DialogNode, on_delete=models.SET_NULL, null=True, default=None, related_name='incoming_answers')

    index = models.SmallIntegerField()
    text = models.TextField()

    class Meta:
        app_label = "data"


class Question(models.Model):
    key = models.BigIntegerField()
    node = models.ForeignKey(DialogNode, on_delete=models.CASCADE, related_name='questions')

    text = models.TextField()

    class Meta:
        app_label = "data"
    



class DialogGraph(models.Model):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False) # unique and anonymous graph name (public links, editing) - not a
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="graphs")
    name = models.TextField()
    first_node = models.OneToOneField(DialogNode, null=True, on_delete=models.SET_NULL, default=None)

    class Meta:
        app_label = 'data'

    def get_data_table_values(self, table_name: str, column_constraints: Dict[str, Any] = {}, return_columns: Union[None, List[str]] = None) -> List[Dict[str, Any]]:
        """
        Perform lookip in data table.

        Args:
            column_constraints: provide exact matching values matching rows have to fulfill
            return_columns: provide column names whose values should be returned (or None, if all columns should be returned)
        Returns:
            list of all rows (including only the subset of columns specified in return_columns) satisfying the constraints
        """
        if not self.graph.tables.exists(name=table_name):
            warnings.warn("Data table", table_name, "not found")
            return []

        # load and parse table
        csv_file = StringIO(self.graph.tables.get(name=table_name).content)
        table = pandas.read_csv(csv_file, delimiter=";")     

        # create list of row indices (start: all rows are candidates)
        if len(table) == 0:
            warnings.warn("Data table", table_name, "is empty")
            return []
       
        results = table.query(" and ".join([f"{col} == {column_constraints[col]}" for col in column_constraints]))        
        # construct list of return columns
        result_cols = return_columns if return_columns else list(table.keys())
        return [{col: row[1][col] for col in result_cols} for row in results[result_cols].iterrows()]

    def get_start_node(self) -> Union[None, DialogNode]:
        return self.first_node

    def copyToUser(self, user: User):
        graph = DialogGraph(owner=user, name=self.name)
        graph.save()

        for node in self.nodes.all():
            newNode = DialogNode(key=node.key, graph=graph, node_type=node.node_type, text=node.text, markup=node.markup, position_x=node.position_x, position_y=node.position_y)
            newNode.save()
            for answer in node.answers.all():
                newAnswer = Answer(key=answer.key, node=newNode, index=answer.index, text=answer.text)
                newAnswer.save()
            for question in node.questions.all():
                newQuestion = Question(key=question.key, node=newNode, text=question.text)
                newQuestion.save()

        for node in self.nodes.all():
            if not isinstance(node.connected_node, type(None)):
                newNode = graph.nodes.get(key=node.key)
                newNode.connected_node = graph.nodes.get(key=node.connected_node.key)
                newNode.save()
            for answer in node.answers.all():
                if not isinstance(answer.connected_node, type(None)):
                    newAnswer = graph.nodes.get(key=node.key).answers.get(key=answer.key)
                    newAnswer.connected_node = graph.nodes.get(key=answer.connected_node.key)
                    newAnswer.save()

        # TODO copy data tables
        graph.first_node = graph.nodes.get(key=self.first_node.key)
        graph.save()


    @classmethod
    def fromJSON(cls, graph_name: str, owner: User, data: str):
        with transaction.atomic():
            nodes_by_key = {}
            answers_by_key = {}
            questions_by_key = {}
            tag_by_key = {}
            start_node = None

            # clear existing values 
            if cls.objects.filter(name=graph_name, owner=owner).exists():
                cls.objects.delete(name=graph_name)      

            # create new graph
            graph = cls(owner=owner, name=graph_name) 
            graph.save()
            
            for tag_json in data['tags']:
                tag = Tag(key=tag_json['id'], color=tag_json['color'], graph=graph)
                tag.save()
                tag_by_key[tag_json['id']] = tag 
            for dialognode_json in data['nodes']:
                # parse node info (have to create all nodes before we can create the answers because they can be linked to otherwise not yet existing nodes)
                node = None
                content_markup = dialognode_json['data']['markup']
                content_text = html_to_raw_text(content_markup)
                node_type_realname = dialognode_json['type']
              
                node = DialogNode(key=dialognode_json['id'], graph=graph,
                                node_type=NodeType.from_real_value(node_type_realname), 
                                text=content_text, markup=content_markup,
                                position_x=dialognode_json['position']['x'], position_y=dialognode_json['position']['y']
                        )
                node.save()
                if node_type_realname == "startNode":
                    start_node = node
                
                assert not node.key in nodes_by_key, f"Node {node.key} already in dataset"
                nodes_by_key[dialognode_json['id']] = node

                for index, answer_json in enumerate(dialognode_json['data']['answers']):
                    # parse answer info and add to created nodes
                    answer = Answer(key=answer_json['id'], node=node,
                                        text=html_to_raw_text(answer_json['text']),
                                        index=index) # store answers in correct order
                    answer.save()
                    answers_by_key[answer_json['id']] = answer
                
                for faq_json in dialognode_json['data']['questions']:
                    question = Question(key=faq_json['id'],text=faq_json['text'], node=node)
                    assert not question.key in questions_by_key, f"Question {question.key} already in dataset"
                    question.save()
                    questions_by_key[faq_json['id']] = question

                for tag_id in dialognode_json['data']['tags']:
                    node.tags.add(tag_by_key[tag_id])
            
            # parse connections
            for connection in data['connections']:
                fromDialogNode = nodes_by_key[connection['source']]
                if fromDialogNode.node_type in [NodeType.INFO,  NodeType.START, NodeType.UPDATE]:
                    fromDialogNode.connected_node = nodes_by_key[connection['target']]
                    fromDialogNode.save()
                else:
                    fromDialogAnswer = answers_by_key[connection['sourceHandle']]
                    fromDialogAnswer.connected_node = nodes_by_key[connection['target']]
                    fromDialogAnswer.save()

            assert not isinstance(start_node, type(None))
            graph.first_node = start_node
            graph.save()

            return graph

    def toJSON(self) -> Dict[str, Any]:
        nodes = []
        connections = []
        faqquestions = []
        tags = [{'id': tag.key, 'color': tag.color} for tag in self.tags.all()]
        tables = []
        for dialog_node in self.nodes.all():
            answers = []
            faqquestions = []
            if dialog_node.node_type in [NodeType.START, NodeType.INFO, NodeType.UPDATE] and dialog_node.connected_node:
                # start node and info nodes has no answers, but outgoing connection -> add here
                nodeId = "0" if dialog_node.node_type == NodeType.START else str(int(time.time())) + str(random.randint(1000,9999))
                connections.append({'id': nodeId, "source": str(dialog_node.key), "sourceHandle": str(dialog_node.key), "target": str(dialog_node.connected_node.key), 'targetHandle': None})
            else:
                for answer in dialog_node.answers.order_by('index'): # add answers in correct order
                    answers.append({
                        'id': str(answer.key),
                        'nodeId': str(dialog_node.key),
                        'text': answer.text,
                    })
                    if not isinstance(answer.connected_node, type(None)):
                        connections.append({
                            'id': str(int(time.time())) + str(random.randint(1000,9999)),
                            'source': str(dialog_node.key),
                            'sourceHandle': str(answer.key),
                            'target': str(answer.connected_node.key),
                            'targetHandle': None
                        })
                # 'destinationNodeID': answer.connectedNode.key if answer.connectedNode else None
            for faq_question in dialog_node.questions.all():
                faqquestions.append({
                    'id': str(faq_question.key),
                    'nodeId': str(dialog_node.key),
                    'text': faq_question.text
                })
            nodes.append({
                'id': str(dialog_node.key),
                'type': dialog_node.get_node_type_display(),
                'position': {
                    'x': dialog_node.position_x,
                    'y': dialog_node.position_y
                },
                'data': {
                    'id': str(dialog_node.key),
                    'markup': dialog_node.markup,
                    'raw_text': dialog_node.text,
                    'position': {
                        'x': dialog_node.position_x,
                        'y': dialog_node.position_y,
                    },
                    "type": dialog_node.get_node_type_display(),
                    'tags': [tag.key for tag in dialog_node.tags.all()],
                    'answers': answers,
                    'questions': faqquestions
                },
            })
        
        for table in self.tables.all():
            tables.append({
                "name": table.name,
                "columns": [col.label for col in table.columns.all()]
            })

        return {'tags': sorted(tags, key=lambda x: x['id']), 'nodes': sorted(nodes, key=lambda x: x['id']), 'connections': sorted(connections, key=lambda x: x['id']), 'dataTables': tables}


@receiver(post_save, sender=User)
def init_new_user(instance, created, raw, **kwargs):
    # raw is set when model is created from loaddata.
    if created and not raw and User.objects.filter(username="_TUTORIAL_").exists():
        new_user = instance
        tutorial_user = User.objects.get(username="_TUTORIAL_")
        tutorial_graph: DialogGraph = tutorial_user.graphs.get(name="Tutorial")
        tutorial_graph.copyToUser(new_user)

    
# TODO on any of the above changes, trigger reload of dialog policy (let policy handle replay? or add dialog buffer as service, and this service can trigger replay from memory)
# TODO add logger as a service insteaed of logger instances per service (this also allows easier collection of distributed logging)
# TODO add UI + service to live change NLU 
# TODO add divider line to chat UI 
# TODO make chat view collapsible in editor
# TODO expand logic nodes to allow for comparisons of variables to other variables
