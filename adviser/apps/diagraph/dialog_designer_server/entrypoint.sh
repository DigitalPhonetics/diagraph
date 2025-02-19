python3 /django_code/adviser/apps/diagraph/dialog_designer_server/manage.py makemigrations
python3 /django_code/adviser/apps/diagraph/dialog_designer_server/manage.py migrate
python3 /django_code/adviser/apps/diagraph/dialog_designer_server/manage.py createsuperuser --no-input
python3 /django_code/adviser/apps/diagraph/dialog_designer_server/manage.py loadDefaultGraph /django_code/adviser/apps/diagraph/dialog_designer_server/tutorial_graph.json
python3 /django_code/adviser/apps/diagraph/dialog_designer_server/manage.py runserver 0.0.0.0:8000 
# & cd /django_code/adviser/apps/diagraph/dialog_designer_ui && npm run start