import { GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [pages, setPages] = useState<Post[]>([]);

  useEffect(() => {
    postsPagination.results.map(post => {
      const formatedDate = format(
        new Date(post.first_publication_date),
        'dd LLL yyyy'
      ).toLocaleLowerCase('pt-BR');

      post.first_publication_date = formatedDate;
      return;
    });

    setPages(postsPagination.results);
  }, []);

  function handlePages() {
    fetch(postsPagination.next_page)
      .then(response => response.json())
      .then(data => setPages([...postsPagination.results, data.results[0]]));
  }

  return (
    <>
      <Head>
        <title>SpaceTraveling</title>
      </Head>
      <Header />

      {pages.map(post => {
        return (
          <main key={post.uid} className={styles.container}>
            <Link href={`/post/${post.uid}`}>
              <a>
                <strong>{post.data.title}</strong>
              </a>
            </Link>
            <p>{post.data.subtitle}</p>
            <div className={styles.infos}>
              <FiCalendar />
              <time>{post.first_publication_date}</time>
              <FiUser />
              <span>{post.data.author}</span>
            </div>
          </main>
        );
      })}
      {postsPagination.next_page ? (
        <a className={styles.button}>
          <button onClick={handlePages}>Carregar mais posts</button>{' '}
        </a>
      ) : (
        ''
      )}
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 2,
    }
  );

  const results = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination = {
    next_page: postsResponse.next_page,
    results,
  };

  return {
    props: { postsPagination },
  };
};
