from django.shortcuts import render

from data.dialogGraph import DialogGraph

def chat_view(request):
    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key

    # get graph & chat settings
    graphId = request.GET['graphId']
    settings = DialogGraph.objects.get(uuid=graphId).settings
    
    return render(request, 'chat.html', {"graphId": graphId, "settings": settings})
