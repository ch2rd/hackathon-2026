import { createBrowserRouter, createHashRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import GameLayout from './layouts/GameLayout';
import MainLayout from './layouts/MainLayout';
import CharacterPage from './pages/CharacterPage';
import { EndingPage } from './pages/EndingPage';
import { GamePage } from './pages/GamePage';
import HomePage from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import ScriptDetailPage from './pages/ScriptDetailPage';
import ScriptLibraryPage from './pages/ScriptLibraryPage';
import { PagePlaceholder } from './components/ui/PagePlaceholder';

const routes: RouteObject[] = [
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/scripts', element: <ScriptLibraryPage /> },
      { path: '/scripts/:scriptId', element: <ScriptDetailPage /> },
      { path: '/scripts/:scriptId/character', element: <CharacterPage /> },
      { path: '/scripts/:scriptId/character/:characterId', element: <CharacterPage /> },
    ],
  },
  {
    element: <GameLayout />,
    children: [
      { path: '/rooms/:roomId', element: <RoomPage /> },
      { path: '/rooms/:roomId/characters', element: <RoomPage /> },
      { path: '/rooms/:roomId/character', element: <CharacterPage /> },
      { path: '/rooms/:roomId/play', element: <GamePage /> },
      {
        path: '/rooms/:roomId/investigate',
        element: (
          <PagePlaceholder
            title="搜证"
            description="庄园地图、地点调查点和线索弹窗。后续接入。"
          />
        ),
      },
      {
        path: '/rooms/:roomId/clues',
        element: (
          <PagePlaceholder
            title="我的线索"
            description="按分类查看当前玩家有权限看到的线索。后续接入。"
          />
        ),
      },
      {
        path: '/rooms/:roomId/reasoning',
        element: (
          <PagePlaceholder
            title="最终推理"
            description="凶手、时间、地点、手法、动机和关键证据。后续接入。"
          />
        ),
      },
      { path: '/rooms/:roomId/ending', element: <EndingPage /> },
      { path: '/rooms/:roomId/reveal', element: <EndingPage /> },
    ],
  },
  {
    path: '*',
    element: (
      <PagePlaceholder
        title="页面不存在"
        description="这个路由还没有实现，请返回首页重新开始。"
      />
    ),
  },
];

export const router =
  import.meta.env.VITE_ROUTER_MODE === 'hash'
    ? createHashRouter(routes)
    : createBrowserRouter(routes);
