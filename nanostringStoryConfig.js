const config = {}

export function getConfig() {
    return config;
}

const SUPPORTED_STORY_TYPES = ['colon', 'lymph node', 'mouse brain', 'human brain', 'kidney', 'pancreas'];

function loadNanostringStory(storyType) {
    const storyFile = (() => {
      switch (storyType) {
        case 'colon':
          return require('./nanostringColon');
        case 'lymph node':
          return require('/nanostringLymphNode');
        case 'mouse brain':
          return require('./nanostringMouseBrain');
        case 'human brain':
          return require('./nanostringHumanBrain');
        case 'kidney':
          return require('./nanostringKidney');
        case 'pancreas':
          return require('./nanostringPancreas');
        default:
          throw new Error('unsupported story type');
      }
    })();
    
    const { story } = storyFile;
    if (!story) {
      throw new Error('Story file does not contain an exported story object');
    }
  
    const expectedShape = ['css'];
    const storyShape = new Set(Object.keys(story));
  
    const diff = expectedShape.filter(s => !storyShape.has(s));
    if (diff.length > 0) {
      throw new Error(`Story is missing properties ${diff}`);
    }
  
    return story;
}

export function setType(storyType) {
    if (SUPPORTED_STORY_TYPES.indexOf(storyType) === -1) {
        throw new Error(`Unsupported story type ${storyType}`);
    }

    config.type = storyType;

    loadNanostringStory(storyType);
}

window.setNanostringStoryType = setType;