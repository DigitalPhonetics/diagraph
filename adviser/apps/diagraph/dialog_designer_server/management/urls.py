from django.urls import path, include
from django.views.generic.base import TemplateView
from .views.signup import SignUpView
from .views.graphs import graph_list, delelete_graph, rename_graph, edit_graph, create_graph, load_graph, dialog_logs
from .views.survey import survey_view, log_survey_results

urlpatterns = [
    path("accounts/", include("django.contrib.auth.urls")),
    path("accounts/signup", SignUpView.as_view(), name='signup'),
    # path("data/dialog_graphs", graph_list, name='graphs'),
    path("data/delete_graph/<str:graphId>", delelete_graph, name='delete_graph'),
    path("data/rename_graph/<str:graphId>", rename_graph, name='rename_graph'),
    path("data/create_graph", create_graph, name='create_graph'),
    path("data/edit_graph/", edit_graph, name='edit_graph'),
    path("data/load_graph/<str:graphId>", load_graph, name='load_graph'),
    path("data/dialog_logs/<str:graphId>",dialog_logs, name='dialog_logs'),
    path('', graph_list, name='home'),
    path('', include('data.urls')),
    path('chat/survey', survey_view, name='survey'),
    path('chat/survey/log_survey_results', log_survey_results, name="log_survey_results" )
]