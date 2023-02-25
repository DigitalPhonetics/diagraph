from django.shortcuts import render

def chat_view(request):
    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key
    
    return render(request, 'chat_ui/index.html', {"graphId": request.GET['graphId']})
