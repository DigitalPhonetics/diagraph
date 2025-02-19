# Generated by Django 5.1.6 on 2025-02-15 15:22

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DataTable',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('content', models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name='DialogGraphSettings',
            fields=[
                ('key', models.BigAutoField(primary_key=True, serialize=False)),
                ('display_answer_buttons', models.BooleanField(default=True)),
                ('allow_text_when_answer_buttons_shown', models.BooleanField(default=True)),
                ('similarity_model', models.CharField(choices=[('MULTILINGUAL', 'sentence-transformers/distiluse-base-multilingual-cased-v2'), ('ENGLISH', 'sentence-transformers/all-mpnet-base-v2'), ("<class 'data.dialogGraph.SimilarityModelType.Meta'>", 'Meta')], default='MULTILINGUAL', max_length=150)),
            ],
        ),
        migrations.CreateModel(
            name='DataTableColumn',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.TextField()),
                ('table', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='columns', to='data.datatable')),
            ],
        ),
        migrations.CreateModel(
            name='DialogGraph',
            fields=[
                ('uuid', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.TextField()),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='graphs', to=settings.AUTH_USER_MODEL)),
                ('settings', models.OneToOneField(default=None, on_delete=django.db.models.deletion.CASCADE, to='data.dialoggraphsettings')),
            ],
        ),
        migrations.AddField(
            model_name='datatable',
            name='graph',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tables', to='data.dialoggraph'),
        ),
        migrations.CreateModel(
            name='ConversationLogEntry',
            fields=[
                ('log_index', models.BigAutoField(primary_key=True, serialize=False)),
                ('user', models.TextField()),
                ('module', models.TextField()),
                ('content', models.TextField()),
                ('graph', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='data.dialoggraph')),
            ],
        ),
        migrations.CreateModel(
            name='DialogNode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.BigIntegerField()),
                ('node_type', models.CharField(choices=[('INFO', 'infoNode'), ('VARIABLE', 'userInputNode'), ('UPDATE', 'variableUpdateNode'), ('RESPONSE', 'userResponseNode'), ('LOGIC', 'logicNode'), ('START', 'startNode'), ("<class 'data.dialogGraph.NodeType.Meta'>", 'Meta')], default='RESPONSE', max_length=40)),
                ('text', models.TextField()),
                ('markup', models.TextField()),
                ('position_x', models.FloatField(default=0.0)),
                ('position_y', models.FloatField(default=0.0)),
                ('connected_node', models.ForeignKey(default=None, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='incoming_nodes', to='data.dialognode')),
                ('graph', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='nodes', to='data.dialoggraph')),
            ],
        ),
        migrations.AddField(
            model_name='dialoggraph',
            name='first_node',
            field=models.OneToOneField(default=None, null=True, on_delete=django.db.models.deletion.SET_NULL, to='data.dialognode'),
        ),
        migrations.CreateModel(
            name='Answer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.BigIntegerField()),
                ('index', models.SmallIntegerField()),
                ('text', models.TextField()),
                ('connected_node', models.ForeignKey(default=None, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='incoming_answers', to='data.dialognode')),
                ('node', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='data.dialognode')),
            ],
        ),
        migrations.CreateModel(
            name='Question',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.BigIntegerField()),
                ('text', models.TextField()),
                ('node', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='data.dialognode')),
            ],
        ),
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.TextField()),
                ('color', models.TextField()),
                ('graph', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tags', to='data.dialoggraph')),
            ],
        ),
        migrations.AddField(
            model_name='dialognode',
            name='tags',
            field=models.ManyToManyField(related_name='nodes', to='data.tag'),
        ),
        migrations.AddConstraint(
            model_name='dialognode',
            constraint=models.UniqueConstraint(fields=('graph', 'key'), name='unique_graph_node_combination'),
        ),
    ]
