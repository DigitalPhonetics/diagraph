import os
import re

with open("build/index.html", "r+") as f:
    content = f.read()
    # find all occurrences of href, capture content and replace with django static URL

    print("Replacing urls...")
    print("content")
    phref = re.compile(r'href="(?P<url>.*?)"')
    content = phref.sub('href="' + r"{% static '\g<url>' %}" + '"', content)
    psrc = re.compile(r'src="(?P<url>.*?)"')
    content = psrc.sub('src="' + r"{% static '\g<url>' %}" + '"', content)
    print('new content', content)
    print("Done")

    f.seek(0)
    f.truncate(0)
    header = """
    {% extends 'base.html' %}
    {% load static %}
    {% block content %}
    {% csrf_token %}
    <input type="hidden" id="useridtoken" value="{{request.session.session_key}}"/>
    """
    footer = """
    {% endblock %}"""
    f.write(header + content + footer)