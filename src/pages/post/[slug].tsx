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

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
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
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading?.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length);

    words.map(word => (total += word));

    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  // const totalWords = post.data.content.reduce((total, contentItem) => {

  //   total += contentItem.heading?.split(' ').length;

  //   const words = contentItem.body.map(item => item.text.split(' ').length);

  //   words.map(word => (total += word));

  //   return total;
  // }, 0);

  // const readTime = Math.ceil(totalWords / 200);

  // ENTENDER ISSO DEPOIS

  const formatedDate = format(
    new Date(post.first_publication_date),
    'dd LLL yyyy'
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
          <FiCalendar />
          <time>{formatedDate}</time>
          <FiUser />
          <span>{post.data.author}</span>
          <FiClock />
          <span>{readTime} min</span>
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    first_publication_date: response.first_publication_date,
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

  // console.log(post.data.content);

  return {
    props: { post },
    redirect: 60 * 30, // 30 minutes
  };
};
