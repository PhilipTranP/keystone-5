// @flow
import { Project } from './project';
import { success, info } from './logger';
import * as fs from 'fs-extra';
import path from 'path';
import endent from 'endent';

export default async function dev(projectDir: string) {
  let project: Project = await Project.create(projectDir);
  project.packages.forEach(({ entrypoints }) => entrypoints.forEach(x => x.strict()));
  info('project is valid!');

  let promises = [];
  await Promise.all(
    project.packages.map(pkg => {
      return Promise.all(
        pkg.entrypoints.map(async _entrypoint => {
          let entrypoint = _entrypoint.strict();
          await fs.remove(path.join(entrypoint.directory, 'dist'));

          await fs.ensureDir(path.join(entrypoint.directory, 'dist'));
          await Promise.all([
            fs.symlink(entrypoint.source, path.join(entrypoint.directory, entrypoint.module)),
            fs.writeFile(
              path.join(entrypoint.directory, entrypoint.main),
              endent`
            'use strict';

            let unregister = require('${require.resolve('./hook')}').___internalHook();

            module.exports = require('${entrypoint.source}');

            unregister();
            
            `
            ),
          ]);
        })
      );
    })
  );

  await Promise.all(promises);

  success('created symlinks!');
}
