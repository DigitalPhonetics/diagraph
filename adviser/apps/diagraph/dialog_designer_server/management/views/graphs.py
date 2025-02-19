from urllib.parse import urlencode
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

import json

from data.dialogGraph import DialogGraph, DialogNode, NodeType, DialogGraphSettings



# @login_required
def graph_list(request):
    graphs = None
    if request.user.is_authenticated:
        graphs = DialogGraph.objects.filter(owner=request.user)
    return render(request, 'home.html', {"graphs": graphs})

@login_required
def create_graph(request):
    default_settings = DialogGraphSettings()
    default_settings.save()
    graph = DialogGraph(owner=request.user, name="newGraph", settings=default_settings)
    startNode = DialogNode(key=0, node_type=NodeType.START, graph=graph, text="START", markup="<p>START</p>", position_x=10, position_y=150)
    graph.save()
    startNode.save()
    graph.first_node = startNode
    graph.save()
    return redirect('home')

@login_required
def delelete_graph(request, graphId: str):
    graph = DialogGraph.objects.get(owner=request.user, uuid=graphId)
    graph.clear_nodes()
    graph.delete()
    return redirect("home")

@login_required
def rename_graph(request, graphId: str):
    graph = DialogGraph.objects.get(owner=request.user, uuid=graphId)
    graph.name = request.POST['newName']
    graph.save()
    return redirect("home")

@login_required
def change_settings(request, graphId: str):
    graph = DialogGraph.objects.get(owner=request.user, uuid=graphId)
    
    if "allowTextWhenAnswerButtonsShown" in request.POST and request.POST['allowTextWhenAnswerButtonsShown'] == "true":
        graph.settings.allow_text_when_answer_buttons_shown = True
    else:
        graph.settings.allow_text_when_answer_buttons_shown = False
    
    if "displayAnswerButtons" in request.POST and request.POST['displayAnswerButtons'] == "true":
        graph.settings.display_answer_buttons = True
    else:
        graph.settings.display_answer_buttons = False

    print("SETTINGS", graph.settings.allow_text_when_answer_buttons_shown, graph.settings.display_answer_buttons)
    
    graph.settings.save()
    return redirect('home')


@login_required
def edit_graph(request):
    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key
    params = {"graphId": request.GET['graphId'], "user": request.user, "session": session_key}
    url = f"http://localhost:8003?{urlencode(params)}"
    print("Redirecting to", url)
    return redirect(url)

@login_required
def load_graph(request, graphId: str):
    # expert graph as json
    graph = DialogGraph.objects.get(owner=request.user, uuid=graphId)
    return HttpResponse(json.dumps(graph.toJSON()))

@login_required
def dialog_logs(request, graphId: str):
    graph = DialogGraph.objects.get(owner=request.user, uuid=graphId)
    log = graph.logs.all().order_by('log_index')
    return render(request, "data/dialog_log.html", {"log": log})