from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

import json

from data.dialogGraph import DialogGraph, DialogNode, NodeType



# @login_required
def graph_list(request):
    graphs = None
    if request.user.is_authenticated:
        graphs = DialogGraph.objects.filter(owner=request.user)
    return render(request, 'home.html', {"graphs": graphs})

@login_required
def create_graph(request):
    graph = DialogGraph(owner=request.user, name="newGraph")
    startNode = DialogNode(key=0, node_type=NodeType.START, graph=graph, text="START", markup="<p>START</p>", position_x=10, position_y=150)
    graph.save()
    startNode.save()
    graph.first_node = startNode
    graph.save()
    return redirect('home')

@login_required
def delelete_graph(request, graphId: str):
    graph = DialogGraph.objects.get(owner=request.user, uuid=graphId)

    for node in graph.nodes.all():
        node.connected_node = None
        node.save()
        for incoming in node.incoming_nodes.all():
            print("incoming pre", incoming.text, incoming.pk)
            incoming.connected_node = None
            incoming.save()
            print("incoming post", incoming)
        for answer in node.answers.all():
            print("Forward", node.answers.count())
            answer.connected_node = None
            answer.save()
            answer.delete()
        for answer in node.incoming_answers.all():
            print("Backward", node.incoming_answers.count())
            answer.connected_node = None
            answer.save()
        if node.connected_node:
            print("conn", node.connected_node.text)
        print("DELET INCOMING COUNT", node.incoming_nodes.count())
        node.delete()

    graph.delete()
    return redirect("home")

@login_required
def rename_graph(request, graphId: str):
    graph = DialogGraph.objects.get(owner=request.user, uuid=graphId)
    graph.name = request.POST['newName']
    graph.save()
    return redirect("home")

@login_required
def edit_graph(request):
    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key
    
    return render(request, 'data/editor_index.html', {"graphId": request.GET['graphId'], "user": request.user})

@login_required
def load_graph(request, graphId: str):
    # expert graph as json
    graph = DialogGraph.objects.get(owner=request.user, uuid=graphId)
    return HttpResponse(json.dumps(graph.toJSON()))

