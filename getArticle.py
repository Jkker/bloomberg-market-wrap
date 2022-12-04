import requests
import json
from bs4 import BeautifulSoup

headers = {
    "accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "cache-control": "max-age=0",
    "if-none-match": 'W/"83186-pFaVzRgCWvzqqvFn+pHfs3ETZn0"',
    "sec-ch-ua":
    '"Microsoft Edge";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1"
}


def fetchUrl(url):
    r = requests.get(url, headers=headers)
    r.encoding = r.apparent_encoding
    return r.text


content_to_remove = ['— With assistance by', 'Read More:']
tags_to_remove = ['script', 'style', 'audio', 'figure', 'aside', 'div', 'meta']
tags_to_unwrap = ['a', 'em', 'i', 'strong', 'b']


def parseBody(body_html):
    soup = BeautifulSoup(body_html, 'lxml').find('body')
    for tag in soup.find_all(None):
        if tag.name in tags_to_remove:
            tag.decompose()
            continue

        if any([tag.text.strip().startswith(x) for x in content_to_remove]):
            tag.decompose()
            continue
        if tag.name in tags_to_unwrap:
            tag.unwrap()
            continue
        if tag.attrs is None:
            continue
        for attr in list(tag.attrs):
            del tag.attrs[attr]
    soup.smooth()
    return soup


def parseArticle(html_str):
    page = BeautifulSoup(html_str, 'lxml')
    if "Are you a robot?" in page.text:
        raise Exception("Rate limited")

    article = json.loads(
        page.find('script', attrs={
            'data-component-props': "SuperburstAd"
        }).text)['story']

    body = parseBody(article['body'])

    return {
        'headline': article['headlineText'],
        'authors': [a.get('name') for a in article['authors']],
        'body': body.prettify(),
        'content': "\n".join([p.text for p in body.find_all(None)]),
        'updatedAt': article['updatedAt'],
        'publishedAt': article['publishedAt'],
        'summary': article['summary'],
    }


def getArticle(url):
    article = parseArticle(fetchUrl(url))
    return article


if __name__ == "__main__":
    with open('data/2022-12-01.json', encoding='utf-8') as f:
        articles = json.load(f)
        success = 0
        fails = 0
        for article in articles:
            if 'content' in article:
                continue
            try:
                data = getArticle(article['url'])
                article.update(data)
                success += 1
                print(f'Parsed {success} articles')
            except Exception as e:
                print(f'{e}: {article["url"]}')
                fails += 1
                continue
        print(f'Parsed {success} articles, failed {fails}')

    with open('data/2022-12-01.json', 'w') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
