import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления обработками территорий (запланированные и текущие)
    Args: event - HTTP запрос с методом и данными
          context - контекст выполнения функции
    Returns: JSON с данными об обработках
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    database_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        query_params = event.get('queryStringParameters', {}) or {}
        treatment_type = query_params.get('type', 'planned')
        
        if method == 'GET':
            if treatment_type == 'planned':
                cursor.execute('''
                    SELECT id, type, area_name, planned_date, coordinates, color, created_by
                    FROM planned_treatments
                    ORDER BY planned_date ASC
                ''')
                
                rows = cursor.fetchall()
                treatments = []
                for row in rows:
                    treatments.append({
                        'id': row[0],
                        'type': row[1],
                        'area': row[2],
                        'date': row[3].isoformat() if row[3] else None,
                        'coordinates': row[4],
                        'color': row[5],
                        'createdBy': row[6]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'treatments': treatments}),
                    'isBase64Encoded': False
                }
            
            elif treatment_type == 'current':
                cursor.execute('''
                    SELECT id, type, area_name, start_date, end_date, coordinates, status, created_by
                    FROM current_treatments
                    WHERE status = 'active'
                    ORDER BY start_date DESC
                ''')
                
                rows = cursor.fetchall()
                treatments = []
                for row in rows:
                    treatments.append({
                        'id': row[0],
                        'type': row[1],
                        'area': row[2],
                        'startDate': row[3].isoformat() if row[3] else None,
                        'endDate': row[4].isoformat() if row[4] else None,
                        'coordinates': row[5],
                        'status': row[6],
                        'createdBy': row[7]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'treatments': treatments}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            admin_token = event.get('headers', {}).get('x-admin-token', '')
            if admin_token not in ['SergSyn', 'IvanGesh']:
                return {
                    'statusCode': 403,
                    'headers': headers,
                    'body': json.dumps({'error': 'Требуется авторизация администратора'}),
                    'isBase64Encoded': False
                }
            
            body_data = json.loads(event.get('body', '{}'))
            
            if treatment_type == 'planned':
                cursor.execute('''
                    INSERT INTO planned_treatments (type, area_name, planned_date, coordinates, color, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (
                    body_data.get('type'),
                    body_data.get('area'),
                    body_data.get('date'),
                    json.dumps(body_data.get('coordinates')),
                    body_data.get('color'),
                    admin_token
                ))
            
            elif treatment_type == 'current':
                cursor.execute('''
                    INSERT INTO current_treatments (type, area_name, start_date, end_date, coordinates, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (
                    body_data.get('type'),
                    body_data.get('area'),
                    body_data.get('startDate'),
                    body_data.get('endDate'),
                    json.dumps(body_data.get('coordinates')),
                    admin_token
                ))
            
            treatment_id = cursor.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({'success': True, 'id': treatment_id}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            admin_token = event.get('headers', {}).get('x-admin-token', '')
            if admin_token not in ['SergSyn', 'IvanGesh']:
                return {
                    'statusCode': 403,
                    'headers': headers,
                    'body': json.dumps({'error': 'Требуется авторизация администратора'}),
                    'isBase64Encoded': False
                }
            
            treatment_id = query_params.get('id')
            
            if treatment_type == 'planned':
                cursor.execute('DELETE FROM planned_treatments WHERE id = %s', (treatment_id,))
            elif treatment_type == 'current':
                cursor.execute('DELETE FROM current_treatments WHERE id = %s', (treatment_id,))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
    
    finally:
        cursor.close()
        conn.close()
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Метод не поддерживается'}),
        'isBase64Encoded': False
    }
