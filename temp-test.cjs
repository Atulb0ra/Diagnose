const {Octokit} = require('octokit');

async function getFileCount(path, octokit, owner, repo, acc = 0) {
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
  if (!Array.isArray(data) && data.type === 'file') {
    return acc + 1;
  }
  if (Array.isArray(data)) {
    let fileCount = 0;
    const directories = [];
    for (const item of data) {
      if (item.type === 'dir') directories.push(item.path);
      else fileCount++;
    }
    if (directories.length > 0) {
      const directoryCounts = await Promise.all(
        directories.map((dir) => getFileCount(dir, octokit, owner, repo, 0))
      );
      fileCount += directoryCounts.reduce((a, c) => (a ?? 0) + (c ?? 0), 0);
    }
    return acc + fileCount;
  }
  return acc;
}

(async () => {
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token });
  for (const url of ['https://github.com/Atulb0ra/Next', 'https://github.com/Atulb0ra/React']) {
    const parts = url.split('/');
    const owner = parts[3];
    const repo = parts[4];
    try {
      const count = await getFileCount('', octokit, owner, repo);
      console.log(url, '=>', count);
    } catch (e) {
      console.error(url, 'error', e.message);
    }
  }
})();