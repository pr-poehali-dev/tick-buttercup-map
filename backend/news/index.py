import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления новостями системы мониторинга
    Args: event - HTTP запрос с методом и данными
          context - контекст выполнения функции
    Returns: JSON с новостями или результатом операции
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
            cursor.execute('''
                SELECT id, title, content, author, created_at, image_url
                FROM news
                WHERE published = true
                ORDER BY created_at DESC
            ''')
            
            rows = cursor.fetchall()
            news_list = []
            for row in rows:
                news_list.append({
                    'id': row[0],
                    'title': row[1],
                    'content': row[2],
                    'author': row[3],
                    'date': row[4].isoformat() if row[4] else None,
                    'imageUrl': row[5]
                })
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'news': news_list}),
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
            
            cursor.execute('''
                INSERT INTO news (title, content, author, image_url)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            ''', (
                body_data.get('title'),
                body_data.get('content'),
                admin_token,
                body_data.get('imageUrl')
            ))
            
            news_id = cursor.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({'success': True, 'id': news_id}),
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
            news_id = query_params.get('id')
            
            cursor.execute('DELETE FROM news WHERE id = %s', (news_id,))
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
