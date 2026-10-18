# ============================================================
# 黑客松仓库常用任务入口
#
# 注意：Makefile 必须使用 Tab 缩进，不要用空格替换。
#
# 本文件是「可选」的便捷入口：
#   - 本机没有安装 make 时，直接调用 bash scripts/*.sh 即可，效果完全相同；
#   - Windows 上 shell 脚本要用 Git 自带的 bash 运行，详见 CONTRIBUTING.md 第七节。
# ============================================================

.DEFAULT_GOAL := help
SHELL := bash

.PHONY: help verify check commit-check hooks install run test clean

## help: 显示可用任务
help:
	@echo "可用任务："
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## /  /'

## verify: 一键本地自检（提交前跑这个）
verify:
	bash scripts/verify.sh

## check: 仅检查仓库结构、密钥、大文件、编码
check:
	bash scripts/check-repo.sh

## commit-check: 校验最近一次提交信息是否规范
commit-check:
	bash scripts/check-commit-msg.sh --range HEAD

## hooks: 安装 Git 钩子（提交信息校验 + 密钥拦截）
hooks:
	bash scripts/install-hooks.sh

## install: 安装依赖 —— 选定技术栈后请替换本目标
install:
	@echo "尚未配置依赖安装命令。请在 Makefile 的 install 目标中填入实际命令，"
	@echo "并同步更新 README.md 的「快速开始」。"

## run: 本地启动 —— 选定技术栈后请替换本目标
run:
	@echo "尚未配置启动命令。请在 Makefile 的 run 目标中填入实际命令。"

## test: 运行项目测试 —— 选定技术栈后请替换本目标
test:
	bash scripts/local-checks.sh

## clean: 清理本地临时文件与构建产物
clean:
	@echo "按实际技术栈补充清理命令（不要删除源码）。"
