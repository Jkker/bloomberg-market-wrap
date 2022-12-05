import json
import os

import requests
from bs4 import BeautifulSoup

h1 = {
    "accept":
    "*/*",
    "accept-language":
    "en-US,en;q=0.9",
    "newrelic":
    "eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkJyb3dzZXIiLCJhYyI6IjE5ODI2OTciLCJhcCI6IjE0MTI1NzU4MCIsImlkIjoiMjY2YWFhNTY2ZDE3MzMzMiIsInRyIjoiZTZhODY2MGU5ZDA5YzA0ZmIxMDkzNWFjYWIyMDBkNTAiLCJ0aSI6MTY3MDI1NzkzMTcyMywidGsiOiIyNTMwMCJ9fQ==",
    "sec-ch-ua":
    '"Microsoft Edge";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile":
    "?0",
    "sec-ch-ua-platform":
    '"Windows"',
    "sec-fetch-dest":
    "empty",
    "sec-fetch-mode":
    "cors",
    "sec-fetch-site":
    "same-origin",
    "traceparent":
    "00-e6a8660e9d09c04fb10935acab200d50-266aaa566d173332-01",
    "tracestate":
    "25300@nr=0-1-1982697-141257580-266aaa566d173332----1670257931723",
    "cookie":
    "seen_uk=1; exp_pref=AMER; agent_id=796ecbed-0a29-4b3e-9e8b-ac668bfae1d0; session_id=78b225b6-851d-4ed9-8fd4-3955565d0f06; session_key=faa80cf7840e4dd282e9d13f9d987a1bc789830f; gatehouse_id=77dcfe29-fcf5-4c90-8690-6b24ec9572bf; geo_info=%7B%22countryCode%22%3A%22US%22%2C%22country%22%3A%22US%22%2C%22cityId%22%3A%225128581%22%2C%22provinceId%22%3A%225128638%22%2C%22field_p%22%3A%2219A63C%22%2C%22field_mi%22%3A-1%2C%22field_n%22%3A%22cp%22%2C%22trackingRegion%22%3A%22US%22%2C%22cacheExpiredTime%22%3A1670862734111%2C%22region%22%3A%22US%22%2C%22fieldMI%22%3A-1%2C%22fieldN%22%3A%22cp%22%2C%22fieldP%22%3A%2219A63C%22%7D%7C1670862734111; _reg-csrf-token=EbTI60cS-6_Ud105cFIQm7WJtUioDCHf7dEs; _reg-csrf=s%3AmFOMH3xn_q5eXRI3WYnuAFGx.ckWynQM8DwfDcsvF4t24GB9XldGjeglcikbxTSM2w%2Fg; _user-data=%7B%22status%22%3A%22anonymous%22%7D; _last-refresh=2022-12-5%2016%3A32",
}


def fetchUrl(url):
    r = requests.get(url, headers=h1)
    r.encoding = r.apparent_encoding
    return r.text


def fetchFile(url: str):
    path = url.replace("https://www.bloomberg.com/news/articles/",
                       "").replace("/", "-")

    path = "../data/articles/" + path + ".html"
    if not os.path.exists(path):
        raise Exception("File not found")
    with open(path, "r", encoding='utf-8') as f:
        return f.read()


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


def getArticle(url, from_files=False):
    html_str = fetchFile(url) if from_files else fetchUrl(url)
    if html_str:
        article = parseArticle(html_str)
        return article
    return


from argparse import ArgumentParser

if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument('input', help='input file name')
    parser.add_argument('--from-files', '-f', action="store_true")
    args = parser.parse_args()
    with open(args.input, encoding='utf-8') as f:
        articles = json.load(f)
        success = 0
        fails = 0
        for article in articles:
            if 'content' in article:
                continue
            try:
                data = getArticle(article['url'], args.from_files)
                if data:
                    article.update(data)
                    success += 1
                    print(f'Parsed #{success}: {article["url"]}')
            except Exception as e:
                print(f'{e}: {article["url"]}')
                fails += 1
                continue
        print(f'Parsed {success} articles, failed {fails}')

    with open(args.input, 'w', encoding='utf-8') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
