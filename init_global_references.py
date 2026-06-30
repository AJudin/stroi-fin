import argparse
import json
import urllib.request
import urllib.error


def main():
    parser = argparse.ArgumentParser(description='Initialize global references on an existing PocketBase instance.')
    parser.add_argument('--base', default='http://127.0.0.1:8090/api', help='PocketBase API base URL')
    parser.add_argument('--identity', default='admin@stroi-fin.local', help='Superuser identity')
    parser.add_argument('--password', default='StroiAdmin123!', help='Superuser password')
    args = parser.parse_args()

    req = urllib.request.Request(
        f'{args.base}/collections/_superusers/auth-with-password',
        data=json.dumps({'identity': args.identity, 'password': args.password}).encode(),
        headers={'Content-Type': 'application/json'},
    )
    TOKEN = json.loads(urllib.request.urlopen(req).read())['token']
    print('TOKEN OK')

    def api(method, path, data=None):
        url = f'{args.base}{path}'
        body = json.dumps(data, ensure_ascii=False).encode() if data else None
        request = urllib.request.Request(
            url,
            data=body,
            headers={'Content-Type': 'application/json', 'Authorization': TOKEN},
            method=method,
        )
        try:
            resp = urllib.request.urlopen(request).read().decode('utf-8')
            return json.loads(resp) if resp else None
        except urllib.error.HTTPError as e:
            print(f'ERROR {method} {path}: {e.read().decode()}')
            raise

    def get_or_create_collection(name, schema):
        try:
            col = api('GET', f'/collections/{name}')
            print(f'Collection {name} already exists')
            return col
        except urllib.error.HTTPError as e:
            if e.code == 404:
                col = api('POST', '/collections', schema)
                print(f'Created collection {name}')
                return col
            raise

    def ensure_relation_field(collection_name, field_name, target_collection_id, required=False):
        col = api('GET', f'/collections/{collection_name}')
        fields = col['fields']
        existing = next((f for f in fields if f['name'] == field_name), None)
        if existing:
            if existing.get('required') != required:
                existing['required'] = required
                api('PATCH', f'/collections/{col["id"]}', {'fields': fields})
                print(f'Updated {collection_name}.{field_name}: required={required}')
            else:
                print(f'{collection_name}.{field_name} already exists')
        else:
            fields.append({
                'name': field_name,
                'type': 'relation',
                'required': required,
                'collectionId': target_collection_id,
            })
            api('PATCH', f'/collections/{col["id"]}', {'fields': fields})
            print(f'Added {collection_name}.{field_name}')

    # Ensure project_id is optional so global references can exist without a project.
    for col_name in ['categories', 'stages']:
        col = api('GET', f'/collections/{col_name}')
        fields = col['fields']
        updated = False
        for field in fields:
            if field['name'] == 'project_id' and field.get('required'):
                field['required'] = False
                updated = True
        if updated:
            api('PATCH', f'/collections/{col["id"]}', {'fields': fields})
            print(f'Updated {col_name}: project_id is now optional')
        else:
            print(f'{col_name} already allows empty project_id')

    # Create legal_entities collection.
    legal_entities_schema = {
        'name': 'legal_entities',
        'type': 'base',
        'listRule': '@request.auth.id != ""',
        'viewRule': '@request.auth.id != ""',
        'createRule': '@request.auth.id != ""',
        'updateRule': '@request.auth.id != ""',
        'deleteRule': '@request.auth.role = "admin"',
        'fields': [
            {'name': 'name', 'type': 'text', 'required': True},
            {'name': 'inn', 'type': 'text', 'required': True},
            {'name': 'is_archived', 'type': 'bool', 'required': False},
        ],
    }
    legal_entities = get_or_create_collection('legal_entities', legal_entities_schema)

    # Add legal_entity_id relations to projects and operations.
    ensure_relation_field('projects', 'legal_entity_id', legal_entities['id'], required=False)
    ensure_relation_field('operations', 'legal_entity_id', legal_entities['id'], required=False)

    # Ensure operations.payment_status includes partial payment and paid_amount field exists.
    operations_col = api('GET', '/collections/operations')
    ops_fields = operations_col['fields']
    ps_field = next((f for f in ops_fields if f['name'] == 'payment_status'), None)
    if ps_field:
        values = ps_field.get('values') or []
        if 'Частично оплачен' not in values:
            ps_field['values'] = list(dict.fromkeys([*values, 'Частично оплачен']))
            api('PATCH', f'/collections/{operations_col["id"]}', {'fields': ops_fields})
            print('Updated operations.payment_status values')
        else:
            print('operations.payment_status already includes partial status')
    else:
        ops_fields.append({
            'name': 'payment_status',
            'type': 'select',
            'required': False,
            'values': ['Оплачен', 'Не оплачен', 'Частично оплачен'],
            'maxSelect': 1,
        })
        api('PATCH', f'/collections/{operations_col["id"]}', {'fields': ops_fields})
        print('Added operations.payment_status')

    if not any(f['name'] == 'paid_amount' for f in ops_fields):
        ops_fields.append({'name': 'paid_amount', 'type': 'number', 'required': False})
        api('PATCH', f'/collections/{operations_col["id"]}', {'fields': ops_fields})
        print('Added operations.paid_amount')
    else:
        print('operations.paid_amount already exists')

    # Create global expense categories if missing.
    global_expense_categories = [
        'ФОТ строителей на повременной форме ОТ',
        'ФОТ строителей на сдельной форме ОТ',
        'Суточные',
        'Спецодежда и СИЗ',
        'Инструмент и расходники',
        'Спецтехника',
        'Проезд бригады',
        'Проживание бригады',
        'Документы для допуска к работам строителей',
        'Прочие расходы',
    ]

    existing = api('GET', '/collections/categories/records')['items']
    existing_names = {c['name'] for c in existing if not c.get('project_id')}

    for name in global_expense_categories:
        if name not in existing_names:
            api('POST', '/collections/categories/records', {
                'name': name,
                'type': 'Расход',
                'is_archived': False,
            })
            print('Created global category:', name)
        else:
            print('Global category already exists:', name)

    print('DONE')


if __name__ == '__main__':
    main()
