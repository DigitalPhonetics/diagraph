from typing import Dict, Iterable
from typing_extensions import override
import pandas
from io import StringIO
from apps.diagraph.data.dialogGraph import DataTable, DialogGraph, DialogNode, NodeType, Question, Answer, DataTableColumn, Tag
from django.db import transaction
from services.service import Service
import os 
import traceback


# configuration (per user) for public service to prevent misuse (configured in `config.env`)
def get_limit(env_var_name: str):
    configured_limit = int(os.environ[env_var_name])
    return configured_limit if configured_limit >= 0 else None

NODE_LIMIT_PER_GRAPH = get_limit('NODE_LIMIT_PER_GRAPH')
TABLE_LIMIT_PER_GRAPH = get_limit('TABLE_LIMIT_PER_GRAPH')
ANSWER_LIMIT_PER_NODE = get_limit('ANSWER_LIMIT_PER_NODE')
FAQ_LIMIT_PER_NODE = get_limit('FAQ_LIMIT_PER_NODE')
TEXT_LENGTH_LIMIT = get_limit('TEXT_LENGTH_LIMIT')

# TODO re-enable tags
# TODO all add / rename functions should return boolean now: quota exceeded or not
# - TODO: handle in UI - show message if exceeded

class DialogDesigner(Service):
    # TODO PUT THIS CODE INTO DIALOGTREE.py => DialogTreeService class!
    def __init__(self, domain: str = "tree", identifier: str = "dialogDesigner",  transports: str = "ws://localhost:8080/ws", realm="adviser") -> None:
        super().__init__(domain=domain, transports=transports, realm=realm, identifier=identifier)
        self.registered = False

    @override
    async def _register(self, session):
        await super()._register(session)
        if not self.registered:
            await self._component._session.register(self.on_graph_rename, "dialogdesigner.graph.rename")
            await self._component._session.register(self.on_connection_add, "dialogdesigner.node.connect")
            await self._component._session.register(self.on_connection_delete, "dialogdesigner.node.disconnect")
            await self._component._session.register(self.on_node_add, "dialogdesigner.node.add")
            await self._component._session.register(self.on_node_position_changed, "dialogdesigner.node.position.changed")
            await self._component._session.register(self.on_node_delete, "dialogdesigner.node.delete")
            await self._component._session.register(self.on_node_text_changed, "dialogdesigner.node.text.changed")
            await self._component._session.register(self.on_node_type_changed, "dialogdesigner.node.type.changed")
            await self._component._session.register(self.on_answer_add, "dialogdesigner.answer.add")
            await self._component._session.register(self.on_answer_delete, "dialogdesigner.answer.delete")
            await self._component._session.register(self.on_answer_text_changed, "dialogdesigner.answer.text.changed")
            await self._component._session.register(self.on_answer_order_changed, "dialogdesigner.answer.order.changed")
            await self._component._session.register(self.on_faq_add, "dialogdesigner.faq.add")
            await self._component._session.register(self.on_faq_delete, "dialogdesigner.faq.delete")
            await self._component._session.register(self.on_faq_text_changed, "dialogdesigner.faq.text.changed")
            await self._component._session.register(self.on_file_import, "dialogdesigner.import")
            await self._component._session.register(self.on_datatable_import, "dialogdesigner.datatable.import")
            await self._component._session.register(self.on_datatable_name_changed, "dialogdesigner.datatable.name.changed")
            await self._component._session.register(self.on_datatable_delete, "dialogdesigner.datatable.delete")
            await self._component._session.register(self.on_tag_add, "dialogdesigner.tag.add")
            await self._component._session.register(self.on_tag_delete, "dialogdesigner.tag.delete")
            await self._component._session.register(self.on_tag_apply, "dialogdesigner.tag.apply")
            await self._component._session.register(self.on_tag_detach, "dialogdesigner.tag.detach")

            self.registered = True


    def on_tag_add(self, graphId: str, tagId: str, color: str):
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        tag = Tag(key=tagId, color=color, graph=graph)
        tag.save()

    def on_tag_delete(self, graphId: str, tagId: str):
        # TODO make sure to detach tag in UI 
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        tag = graph.tags.get(key=tagId)
        tag.delete()
    
    def on_tag_apply(self, graphId: str, tagId: str, nodeId: str):
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        tag = graph.tags.get(key=tagId)
        node = graph.nodes.get(key=nodeId)
        node.tags.add(tag)

    def on_tag_detach(self, graphId: str, tagId: str, nodeId: str):
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        tag = graph.tags.get(key=tagId)
        node = graph.nodes.get(key=nodeId)
        node.tags.remove(tag)

    def on_graph_rename(self, graphId: str, newName: str) -> bool:
        if not isinstance(TEXT_LENGTH_LIMIT, type(None)) and len(newName) > TEXT_LENGTH_LIMIT:
            return False

        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        graph.name = newName
        graph.save()

        return True

    def on_datatable_import(self, graphId: str, data: str, name: str):
        """
        Args:
            data: CSV data
        """
        # TODO limit upload size of a single table, too
        try:
            graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
            
            # save content
            name = name.replace(".csv", "")
            table = DataTable(name=name, content=data, graph=graph)
            table.save()

            # extract metadata
            csv_file = StringIO(data)
            content = pandas.read_csv(csv_file, delimiter=";") 
            columns = list(content)
            for column in columns:
                col = DataTableColumn(label=column, table=table)
                col.save()

            print("GOT DATA TABLE WITH COLUMNS", columns)
            return {
                "name": table.name,
                "columns": columns
            }
        except:
            print("Problem while uploading data table:")
            traceback.print_exc()
            return False

    def on_datatable_name_changed(self, graphId: str, oldName: str, newName: str) -> bool:
        if not isinstance(TEXT_LENGTH_LIMIT, type(None)) and len(newName) > TEXT_LENGTH_LIMIT:
            return False

        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        table: DataTable = graph.tables.get(name=oldName)

        table.name = newName
        table.save()

        print("CHANGED DATA TABLE NAME FROM", oldName, "TO", newName)
        return True

    def on_datatable_delete(self, graphId: str, name: str):
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        table: DataTable = graph.tables.get(name=name)
        table.columns.all().delete()

        table.delete() 

        print("DELETED DATA TABLE", name)

    def on_file_import(self, json_data: dict, graphId: str):
        # TODO how to handle upload limits here
        print("ON FILE IMPORT")
        old_graph = DialogGraph.objects.get(uuid=graphId)
        owner = old_graph.owner
        graph_name = old_graph.name

        graph = DialogGraph.fromJSON(graph_name=graph_name, owner=owner, data=json_data)
        print("IMPORTED TREE with", graph.nodes.count(), "nodes")

    def on_answer_add(self, graphId: str, nodeId: int, answer: dict) -> bool:
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)

        if not isinstance(ANSWER_LIMIT_PER_NODE, type(None)) and node.answers.count() >= ANSWER_LIMIT_PER_NODE:
            return False

        print(answer)
        answer = Answer(key=answer['id'], index=node.answers.count(), text=answer['text'], node=node)
        answer.save()

        print("Added answer")
        return True

    def on_answer_delete(self, graphId: str, nodeId: int, answerId: int):
        print("DELETING answer")
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)
        answer: Answer = node.answers.get(key=answerId)

        answer.delete()

        print("DELETED ANSWER")

    def on_answer_text_changed(self, graphId: str, nodeId: int, answerId: int, text: str) -> bool:
        if not isinstance(TEXT_LENGTH_LIMIT, type(None)) and len(text) > TEXT_LENGTH_LIMIT:
            return False

        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)
        answer: Answer = node.answers.get(key=answerId)

        answer.text = text
        answer.save()

        print("CHANGED ANSWER TEXT")
        return True

    def on_answer_order_changed(self, graphId: str, nodeId: int, answerIds: Iterable[str]):
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)
        
        for idx, answerId in enumerate(answerIds):
            answer: Answer = node.answers.get(key=answerId)
            answer.index = idx
            answer.save()

        print("CHANGED ANSWER ORDER")

    def on_node_add(self, graphId: str, node: dict) -> bool:
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)

        if (not (isinstance(NODE_LIMIT_PER_GRAPH, type(None)) or NODE_LIMIT_PER_GRAPH < 0)) and graph.nodes.count() >= NODE_LIMIT_PER_GRAPH:
            return False

        nodeobj = DialogNode(key=node['id'], node_type=NodeType.from_real_value(node['type']),
                                    text=node['data']['raw_text'], markup=node['data']['markup'],
                                    position_x=node['position']['x'], position_y=node['position']['y'],
                                    graph=graph)
        nodeobj.save()
        # for answer in node['data']['answers']:
        #     result = self.on_answer_add(graphId=graphId, nodeId=nodeobj.key, answer=answer)
        #     if not result:
        #         return False

        # TODO: check if node has answers and connections?
        # could only happen after copy-paste? connections should always be empty though
        print("Added Node")
        return True

    def on_node_text_changed(self, graphId: str, nodeId: int, markup: str, raw: str) -> bool:
        if not isinstance(TEXT_LENGTH_LIMIT, type(None)) and len(markup) > TEXT_LENGTH_LIMIT:
            return False

        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)
        
        node.text = raw
        node.markup = markup
        node.save()

        print("Node text changed to", raw)
        return True
    
    def on_node_position_changed(self, graphId: str, nodeId: int, position: Dict[str, float]):
        print("POSITION CHANGE FOR GRAPH", graphId, "(", type(graphId), ")")
        print("EXISTING GRAPHS:")
        for g in DialogGraph.objects.all():
            print(" -> g", g.pk, "(", type(g.pk), ")")

        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)

        node.position_x = position['x']
        node.position_y = position['y']
        node.save()

        print("POSITION CHANGE", nodeId, position)
    
    def on_node_delete(self, graphId: str, nodeId: int) -> bool:
        print("DELETING NODE")
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)

        node.connected_node = None
        node.save()
        for incoming in node.incoming_nodes.all():
            print("incoming pre", incoming.text, incoming.pk)
            incoming.connected_node = None
            incoming.save()
            print("incoming post", incoming)
        # for answer in node.answers.all():
        #     print("Forward", node.answers.count())
        #     answer.connected_node = None
        #     answer.save()
        #     answer.delete()
        for answer in node.incoming_answers.all():
            print("Backward", node.incoming_answers.count())
            answer.connected_node = None
            answer.save()
        if node.connected_node:
            print("conn", node.connected_node.text)
        # node.questions.all().delete()
        print("DELET INCOMING COUNT", node.incoming_nodes.count())
        node.delete()

        print("DELETE NODE", nodeId)
        return True

    def on_node_type_changed(self, graphId: str, nodeId: int, nodeType: str) -> bool:
        # NOTE: deletion of answers, adding of new answers handled by the UI and propagated using the events declared here
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)

        node.node_type = NodeType.from_real_value(nodeType)
        node.save()

        print("CHANGED NODE TYPE")
        return True
        
    def on_connection_add(self, graphId: str, connection):
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        fromNode: DialogNode = graph.nodes.get(key=connection['source'])
        toNode: DialogNode = graph.nodes.get(key=connection['target'])

        print("ADDING CONNECTION FROM", fromNode.key, " TO ", toNode.key)
        print(" - SOURCE HANDLE", connection['sourceHandle'])

        if connection['sourceHandle'] in [None, 0, connection['source']]:
            # either start node oder info node (no answers, only direct node-node connection)
            fromNode.connected_node = toNode
            fromNode.save()
        else:
            # neither start node nor info node (we do have an answer-node connection)
            answer: Answer = fromNode.answers.get(key=connection['sourceHandle'])
            answer.connected_node = toNode
            answer.save()

        print("Added connection")

    def on_connection_delete(self, graphId: str, sourceNodeId: int, sourceHandle: int):
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        fromNode: DialogNode = graph.nodes.get(key=sourceNodeId)

        fromNode.connected_node = None
        print("- FROM NODE", fromNode.key)
        if sourceHandle and sourceHandle != sourceNodeId: # 0: start node -> has no answer
            # neither start node nor info node (we do have an answer-node connection)
            print(" - - source handle", sourceHandle)
            print(" - - answers", [ans.key for ans in fromNode.answers.all()])
            answer: Answer = fromNode.answers.get(key=sourceHandle)
            answer.connected_node = None
            answer.save()
        fromNode.save()

        print("Deleted connection")
        
    def on_faq_add(self, graphId: str, faq: dict) -> bool:
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=faq['nodeId'])

        if not isinstance(FAQ_LIMIT_PER_NODE, type(None)) and node.questions.count() >= FAQ_LIMIT_PER_NODE:
            return False

        question = Question(key=faq['id'], text=faq['text'], node=node)
        question.save()

        print("ADDED FAQ", faq)
        return True

    def on_faq_delete(self, graphId: str, nodeId: int, faqId: int):
        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)

        question: Question = node.questions.get(key=faqId)
        question.delete()

        print("DELETED FAQ")

    def on_faq_text_changed(self, graphId: str, nodeId: int, faqId: int, text: str) -> bool:
        if not isinstance(TEXT_LENGTH_LIMIT, type(None)) and len(text) > TEXT_LENGTH_LIMIT:
            return False

        graph: DialogGraph = DialogGraph.objects.get(uuid=graphId)
        node: DialogNode = graph.nodes.get(key=nodeId)

        question: Question = node.questions.get(key=faqId)
        question.text = text
        question.save()

        print("CHANGED FAQ TEXT", text)
        return True
