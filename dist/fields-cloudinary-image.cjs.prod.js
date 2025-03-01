'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var _objectSpread = require('@babel/runtime/helpers/objectSpread2');
var fields = require('@keystonejs/fields');
var Block = require('@keystonejs/fields-content/Block');
var blocks = require('@keystonejs/fields-content/blocks');

function _interopDefault (e) { return e && e.__esModule ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefault(path);

const pkgDir = path__default['default'].dirname(require.resolve('@keystonejs/fields-cloudinary-image/package.json'));
const resolveView = pathname => path__default['default'].join(pkgDir, pathname);

class CloudinaryImage$1 extends fields.File.implementation {
  constructor() {
    super(...arguments);
    this.graphQLOutputType = 'CloudinaryImage_File'; // Ducktype the adapter

    if (typeof this.fileAdapter.publicUrlTransformed !== 'function') {
      throw new Error('CloudinaryImage field must be used with CloudinaryAdapter');
    }
  }

  gqlOutputFields() {
    return [`${this.path}: ${this.graphQLOutputType}`];
  }

  extendAdminMeta(meta) {
    // Overwrite so we have only the original meta
    return meta;
  }

  getFileUploadType() {
    return 'Upload';
  }

  getGqlAuxTypes({
    schemaName
  }) {
    return [...super.getGqlAuxTypes({
      schemaName
    }), `
      """
      Mirrors the formatting options [Cloudinary provides](https://cloudinary.com/documentation/image_transformation_reference).
      All options are strings as they ultimately end up in a URL.
      """
      input CloudinaryImageFormat {
        """ Rewrites the filename to be this pretty string. Do not include \`/\` or \`.\` """
        prettyName: String
        width: String
        height: String
        crop: String
        aspect_ratio: String
        gravity: String
        zoom: String
        x: String
        y: String
        format: String
        fetch_format: String
        quality: String
        radius: String
        angle: String
        effect: String
        opacity: String
        border: String
        background: String
        overlay: String
        underlay: String
        default_image: String
        delay: String
        color: String
        color_space: String
        dpr: String
        page: String
        density: String
        flags: String
        transformation: String
      }`, `extend type ${this.graphQLOutputType} {
        publicUrlTransformed(transformation: CloudinaryImageFormat): String
      }`];
  } // Called on `User.avatar` for example


  gqlOutputFieldResolvers() {
    return {
      [this.path]: item => {
        const itemValues = item[this.path];

        if (!itemValues) {
          return null;
        }

        return _objectSpread({
          publicUrl: this.fileAdapter.publicUrl(itemValues),
          publicUrlTransformed: ({
            transformation
          }) => this.fileAdapter.publicUrlTransformed(itemValues, transformation)
        }, itemValues);
      }
    };
  }

  getBackingTypes() {
    return {
      [this.path]: {
        optional: true,
        type: 'any'
      }
    };
  }

}

const MongoCloudinaryImageInterface = fields.File.adapters.mongoose;
const KnexCloudinaryImageInterface = fields.File.adapters.knex;

const RelationshipWrapper = _objectSpread(_objectSpread({}, fields.Relationship), {}, {
  implementation: class extends fields.Relationship.implementation {
    async resolveNestedOperations(operations, item, context, ...args) {
      const result = await super.resolveNestedOperations(operations, item, context, ...args);
      context._blockMeta = context._blockMeta || {};
      context._blockMeta[this.listKey] = context._blockMeta[this.listKey] || {};
      context._blockMeta[this.listKey][this.path] = result;
      return result;
    }

  }
});

class ImageBlock extends Block.Block {
  constructor({
    adapter
  }, {
    fromList,
    joinList,
    createAuxList,
    getListByKey
  }) {
    super(...arguments);
    this.joinList = joinList;
    const auxListKey = getListByKey(fromList).adapter.parentAdapter.name === 'prisma' ? `KS_Block_${fromList}_${this.type}` : `_Block_${fromList}_${this.type}`; // Ensure the list is only instantiated once per server instance.

    let auxList = getListByKey(auxListKey);

    if (!auxList) {
      auxList = createAuxList(auxListKey, {
        fields: {
          image: {
            type: CloudinaryImage,
            isRequired: true,
            adapter,
            schemaDoc: 'Cloudinary Image data returned from the Cloudinary API'
          },
          align: {
            type: fields.Select,
            defaultValue: 'center',
            options: ['left', 'center', 'right'],
            schemaDoc: 'Set the image alignment'
          },
          // Useful for doing reverse lookups such as:
          // - "Get all images in this post"
          // - "List all users mentioned in comment"
          from: {
            type: fields.Relationship,
            isRequired: true,
            ref: `${joinList}.${this.path}`,
            schemaDoc: 'A reference back to the Slate.js Serialised Document this image is embedded within'
          }
        }
      });
    }

    this.auxList = auxList;
  }

  get type() {
    return 'cloudinaryImage';
  }

  get path() {
    return 'cloudinaryImages';
  }

  getAdminViews() {
    return [resolveView('views/blocks/single-image'), ...new blocks.imageContainer().getAdminViews(), ...new blocks.caption().getAdminViews()];
  }

  getFieldDefinitions() {
    return {
      [this.path]: {
        type: RelationshipWrapper,
        ref: `${this.auxList.key}.from`,
        many: true,
        schemaDoc: 'Images which have been added to the Content field'
      }
    };
  }

  getMutationOperationResults({
    context
  }) {
    return {
      [this.path]: context._blockMeta && context._blockMeta[this.joinList] && context._blockMeta[this.joinList][this.path]
    };
  }

  getViewOptions() {
    return {
      query: `
        cloudinaryImages {
          id
          image {
            publicUrl
          }
          align
        }
      `
    };
  }

}

const CloudinaryImage = {
  type: 'CloudinaryImage',
  implementation: CloudinaryImage$1,
  views: {
    Controller: resolveView('views/Controller'),
    Field: resolveView('views/Field'),
    Cell: resolveView('views/Cell')
  },
  adapters: {
    mongoose: MongoCloudinaryImageInterface,
    knex: KnexCloudinaryImageInterface
  },
  blocks: {
    image: ImageBlock // gallery: {
    //   type: 'cloudinaryGallery',
    // },

  }
};

exports.CloudinaryImage = CloudinaryImage;
