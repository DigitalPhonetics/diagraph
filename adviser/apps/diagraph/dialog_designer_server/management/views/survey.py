import json
import logging
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse

# @login_required
def survey_view(request):
    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key

    template_name = 'survey.html'
    return render(request, template_name)


def log_survey_results(request):
    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key  

    logger = logging.getLogger('survey')

    survey_dict = json.loads(request.POST["survey_dict"])
    survey_response = [f'username: {session_key}']
    # All fields will always have a value, so we don't need to check this
    for key in sorted(survey_dict.keys()):
        survey_response.append(f"{key}: {survey_dict[key]}")
    
    survey_response = "||".join(survey_response)
    logger.info(survey_response)
    return JsonResponse({})