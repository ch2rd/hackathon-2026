import { createBrowserRouter } from 'react-router-dom';
import GameLayout from './layouts/GameLayout';
import MainLayout from './layouts/MainLayout';
import CharacterPage from './pages/CharacterPage';
import HomePage from './pages/HomePage';
import ScriptDetailPage from './pages/ScriptDetailPage';
import ScriptLibraryPage from './pages/ScriptLibraryPage';
// 注意：A 的页面用默认导出，B 的三个页面用命名导出，这里按各自风格引入。
import { EndingPage } from './pages/EndingPage';
import { GamePage } from './pages/GamePage';
import { RoomPage } from './pages/RoomPage';
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
      // B 的三个页面（契约见 src/pages/pages.test.tsx 的 ALL_ROUTES）：
      // /rooms/:roomId、/rooms/:roomId/play、/rooms/:roomId/ending
      { path: '/rooms/:roomId', element: <RoomPage /> },
      { path: '/rooms/:roomId/play', element: <GamePage /> },
      { path: '/rooms/:roomId/ending', element: <EndingPage /> },

      // B 的 GamePage 会链到 /rooms/:roomId/character（AGENTS §2.2 的角色档案页）。
      // A 的 CharacterPage 依赖 :scriptId，在房间语境下取不到剧本，故先保留占位，
      // 待 A/B 对接「按 roomId 取当前玩家角色」。
      {
        path: '/rooms/:roomId/character',
        element: (
          <PagePlaceholder
            title="角色档案"
            description="按房间取当前玩家的角色与秘密。需要借助 roomId 取数据，待 A/B 对接。"
          />
        ),
      },

      // 以下为 A 规划中的细化页面（10 页方案），当前没有实现，保留占位不删除。
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
