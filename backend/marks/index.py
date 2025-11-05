import json
import os
import psycopg2
from datetime import datetime, timedelta
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для работы с метками клещей и борщевика
    Args: event - HTTP запрос с методом и данными
          context - контекст выполнения функции
    Returns: JSON с метками или результатом операции
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
        if method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            verified_only = query_params.get('verified') == 'true'
            
            if verified_only:
                cursor.execute('''
                    SELECT id, type, latitude, longitude, verified, created_at, description
                    FROM marks
                    WHERE verified = true
                    ORDER BY created_at DESC
                ''')
            else:
                cursor.execute('''
                    SELECT id, type, latitude, longitude, verified, created_at, description
                    FROM marks
                    ORDER BY created_at DESC
                ''')
            
            rows = cursor.fetchall()
            marks = []
            for row in rows:
                marks.append({
                    'id': row[0],
                    'type': row[1],
                    'lat': float(row[2]),
                    'lng': float(row[3]),
                    'verified': row[4],
                    'date': row[5].isoformat() if row[5] else None,
                    'description': row[6]
                })
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'marks': marks}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            mark_type = body_data.get('type')
            latitude = body_data.get('latitude')
            longitude = body_data.get('longitude')
            description = body_data.get('description', '')
            
            request_context = event.get('requestContext', {})
            identity = request_context.get('identity', {})
            user_ip = identity.get('sourceIp', 'unknown')
            user_agent = event.get('headers', {}).get('user-agent', '')
            
            cursor.execute('''
                SELECT action_count, last_action 
                FROM rate_limits 
                WHERE user_ip = %s AND action_type = 'add_mark'
            ''', (user_ip,))
            
            rate_limit = cursor.fetchone()
            if rate_limit:
                count, last_action = rate_limit
                time_diff = datetime.now() - last_action
                
                if time_diff < timedelta(hours=1) and count >= 5:
                    return {
                        'statusCode': 429,
                        'headers': headers,
                        'body': json.dumps({'error': 'Превышен лимит: максимум 5 меток в час'}),
                        'isBase64Encoded': False
                    }
                
                if time_diff >= timedelta(hours=1):
                    cursor.execute('''
                        UPDATE rate_limits 
                        SET action_count = 1, last_action = CURRENT_TIMESTAMP
                        WHERE user_ip = %s AND action_type = 'add_mark'
                    ''', (user_ip,))
                else:
                    cursor.execute('''
                        UPDATE rate_limits 
                        SET action_count = action_count + 1, last_action = CURRENT_TIMESTAMP
                        WHERE user_ip = %s AND action_type = 'add_mark'
                    ''', (user_ip,))
            else:
                cursor.execute('''
                    INSERT INTO rate_limits (user_ip, action_type, action_count, last_action)
                    VALUES (%s, 'add_mark', 1, CURRENT_TIMESTAMP)
                ''', (user_ip,))
            
            cursor.execute('''
                INSERT INTO marks (type, latitude, longitude, user_ip, user_agent, description)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (mark_type, latitude, longitude, user_ip, user_agent, description))
            
            mark_id = cursor.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({'success': True, 'id': mark_id, 'message': 'Метка добавлена на проверку'}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            admin_token = event.get('headers', {}).get('x-admin-token', '')
            if admin_token not in ['SergSyn', 'IvanGesh']:
                return {
                    'statusCode': 403,
                    'headers': headers,
                    'body': json.dumps({'error': 'Требуется авторизация администратора'}),
                    'isBase64Encoded': False
                }
            
            body_data = json.loads(event.get('body', '{}'))
            mark_id = body_data.get('id')
            verified = body_data.get('verified')
            
            cursor.execute('''
                UPDATE marks 
                SET verified = %s, verified_at = CURRENT_TIMESTAMP, verified_by = %s
                WHERE id = %s
            ''', (verified, admin_token, mark_id))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True}),
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
            
            query_params = event.get('queryStringParameters', {}) or {}
            mark_id = query_params.get('id')
            
            cursor.execute('DELETE FROM marks WHERE id = %s', (mark_id,))
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
