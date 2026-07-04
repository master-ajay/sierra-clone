'use server';

import { redirect } from 'next/navigation';
import { getDb } from './db';
import { createArticle, getArticle, updateArticle, setArticleStatus } from './articles';
import { ingestArticle } from './ingestion';

export async function createArticleAction(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  const content = String(formData.get('content') ?? '');
  if (!title || !content) {
    throw new Error('title and content are required');
  }
  const db = getDb();
  const article = createArticle(db, { title, content });
  const result = await ingestArticle(article.article_id, article.content);
  setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null);
  redirect(`/articles/${article.article_id}`);
}

export async function updateArticleAction(articleId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '');
  const content = String(formData.get('content') ?? '');
  const db = getDb();
  const article = updateArticle(db, articleId, { title, content });
  if (!article) {
    throw new Error('article not found');
  }
  const result = await ingestArticle(article.article_id, article.content);
  setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null);
  redirect(`/articles/${articleId}`);
}

export async function reindexArticleAction(articleId: string) {
  const db = getDb();
  const article = getArticle(db, articleId);
  if (!article) {
    throw new Error('article not found');
  }
  const result = await ingestArticle(article.article_id, article.content);
  setArticleStatus(db, article.article_id, result.success ? 'indexed' : 'error', result.error ?? null);
  redirect(`/articles/${articleId}`);
}
