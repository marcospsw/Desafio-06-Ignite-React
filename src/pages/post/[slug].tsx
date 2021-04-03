import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';
import styles from './post.module.scss';
import { format } from 'date-fns';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/router';
import CommentBox from '../../components/CommentBox';
import Link from 'next/link';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    uid: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  nextPost: Post;
  prevPost: Post;
  preview: boolean;
}

export default function Post({ post, nextPost, prevPost, preview }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total = contentItem.heading?.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);

    words.map(word => (total = total + word));

    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  const formatedDate = format(
    new Date(post.first_publication_date),
    'dd LLL yyyy'
  ).toLocaleLowerCase('pt-BR');

  const formatedEditDate = format(
    new Date(post.last_publication_date),
    "dd LLL yyyy, 'às' kk:mm"
  ).toLocaleLowerCase('pt-BR');

  return (
    <>
      <Head>
        <title>SpaceTraveling</title>
      </Head>
      <Header />
      <img className={styles.img} src={post.data.banner.url} />

      <main className={styles.container}>
        <h1>{post.data.title}</h1>
        <div className={styles.info}>
          <time>
            <FiCalendar />
            {formatedDate}
          </time>
          <span>
            <FiUser />
            {post.data.author}
          </span>
          <span>
            <FiClock />
            {readTime} min
          </span>
          <span>* editado em {formatedEditDate && formatedEditDate}</span>
        </div>

        {post.data.content.map(content => {
          return (
            <div key={content.heading} className={styles.content}>
              <h2>{content.heading}</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
                className={styles.contenta}
              />
            </div>
          );
        })}
      </main>

      <footer className={styles.footerContainer}>
        {prevPost.data.title.length === 0 ? (
          <section />
        ) : (
          <section>
            <p>{prevPost.data.title}</p>
            <Link href={`/post/${prevPost.data.uid}`}>
              <a>
                <span>Post anterior</span>
              </a>
            </Link>
          </section>
        )}

        {nextPost.data.title.length === 0 ? (
          <section />
        ) : (
          <section>
            <p>{nextPost.data.title}</p>
            <Link href={`/post/${nextPost.data.uid}`}>
              <a>
                <span>Proximo post</span>
              </a>
            </Link>
          </section>
        )}
      </footer>

      <CommentBox />

      {preview && (
        <aside>
          <Link href="/api/exit-preview">
            <a>Sair do modo Preview</a>
          </Link>
        </aside>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts')
  );

  const paths = posts.results.map(post => {
    return {
      params: { slug: post.uid },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: content.body,
        };
      }),
    },
  };

  const responsePrevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const prevPost = {
    data: {
      uid: responsePrevPost.results.map(result => {
        return result.uid;
      }),
      title: responsePrevPost.results.map(result => {
        return result.data.title;
      }),
    },
  };

  const responseNextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const nextPost = {
    data: {
      uid: responseNextPost.results.map(result => {
        return result.uid;
      }),
      title: responseNextPost.results.map(result => {
        return result.data.title;
      }),
    },
  };

  return {
    props: { post, prevPost, nextPost, preview },
    redirect: 60 * 30, // 30 minutes
  };
};
