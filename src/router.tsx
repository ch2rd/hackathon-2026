import { createBrowserRouter } from 'react-router-dom';
import GameLayout from './layouts/GameLayout';
import MainLayout from './layouts/MainLayout';
import CharacterPage from './pages/CharacterPage';
import HomePage from './pages/HomePage';
import ScriptDetailPage from './pages/ScriptDetailPage';
import ScriptLibraryPage from './pages/ScriptLibraryPage';
import { PagePlaceholder } from './components/ui/PagePlaceholder';

export const router = createBrowserRouter([
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
      {
        path: '/rooms/:roomId',
        element: (
          <PagePlaceholder
            title="房间等候"
            description="房间号、玩家列表、准备状态和房主开始。由 B 接入。"
          />
        ),
      },
      {
        path: '/rooms/:roomId/characters',
        element: (
          <PagePlaceholder
            title="角色选择"
            description="选择角色、查看公开介绍、准备与开始。由 B 接入。"
          />
        ),
      },
      {
        path: '/rooms/:roomId/play',
        element: (
          <PagePlaceholder
            title="游戏房间"
            description="当前幕、剧情、AI DM、玩家列表和线索面板。由 B 接入。"
          />
        ),
      },
      {
        path: '/rooms/:roomId/investigate',
        element: (
          <PagePlaceholder
            title="搜证"
            description="庄园地图、地点调查点和线索弹窗。由 B 接入。"
          />
        ),
      },
      {
        path: '/rooms/:roomId/clues',
        element: (
          <PagePlaceholder
            title="我的线索"
            description="按分类查看当前玩家有权限看到的线索。由 B 接入。"
          />
        ),
      },
      {
        path: '/rooms/:roomId/reasoning',
        element: (
          <PagePlaceholder
            title="最终推理"
            description="凶手、时间、地点、手法、动机和关键证据。由 B 接入。"
          />
        ),
      },
      {
        path: '/rooms/:roomId/reveal',
        element: (
          <PagePlaceholder
            title="真相揭晓"
            description="时间线、真相、评分和再来一局。由 B 接入。"
          />
        ),
      },
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
]);